"""
train.py — Feature engineering + Random Forest training
Queries estaciones_historico directly from PostgreSQL and trains
one RandomForestRegressor per fuel type (G95, G98, Diesel).
"""

import os
import logging
from datetime import datetime, timedelta

import pandas as pd
import psycopg2
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

logger = logging.getLogger(__name__)

# ── DB connection ──────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "data_fuel"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "12344321"),
}

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

FUEL_COLS = {
    "g95": "precio_g95",
    "g98": "precio_g98",
    "diesel": "precio_diesel",
}

# Features used for training (mirrors ai_training.py reference)
FEATURES = [
    "id_gasolinera_num",   # encoded station id
    "id_municipio_num",    # encoded municipality id
    "lat",
    "lon",
    "dia_semana",          # 0=Monday … 6=Sunday
    "mes",                 # 1-12
    "dia_mes",             # 1-31
    "semana",              # ISO week number
    "precio_lag_1",        # price 1 day ago (same station)
    "precio_lag_3",        # price 3 days ago
    "precio_lag_7",        # price 7 days ago
    "precio_media_7",      # 7-day rolling mean
]


# ── Data loading ───────────────────────────────────────────────────────────────

def load_data(fuel_col: str) -> pd.DataFrame:
    """
    Loads estaciones_historico and engineers lag/rolling features.
    Uses a SQL window query to avoid loading the full table in memory.
    """
    sql = f"""
        SELECT
            id_gasolinera,
            id_municipio,
            id_provincia,
            provincia,
            lat::float,
            lon::float,
            {fuel_col}::float                                          AS precio,
            actualizado::date                                          AS fecha
        FROM estaciones_historico
        WHERE {fuel_col} IS NOT NULL
          AND actualizado IS NOT NULL
          AND lat IS NOT NULL
          AND lon IS NOT NULL
          AND actualizado >= CURRENT_DATE - INTERVAL '90 days'
        ORDER BY id_gasolinera, fecha
    """

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor()
        cur.execute(sql)
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        df = pd.DataFrame(rows, columns=cols)
        cur.close()
    finally:
        conn.close()

    if df.empty:
        raise ValueError(f"No data found in estaciones_historico for {fuel_col}")

    logger.info(f"[{fuel_col}] Loaded {len(df):,} rows from DB")

    # ── Temporal features ──────────────────────────────────────────────────────
    df["fecha"] = pd.to_datetime(df["fecha"])
    df["dia_semana"] = df["fecha"].dt.dayofweek
    df["mes"]        = df["fecha"].dt.month
    df["dia_mes"]    = df["fecha"].dt.day
    df["semana"]     = df["fecha"].dt.isocalendar().week.astype(int)

    # ── Encode categorical ids numerically ─────────────────────────────────────
    df["id_gasolinera_num"] = df["id_gasolinera"].astype("category").cat.codes
    df["id_municipio_num"]  = df["id_municipio"].fillna("0").astype("category").cat.codes

    # ── Lag features (per station) ─────────────────────────────────────────────
    df = df.sort_values(["id_gasolinera", "fecha"])
    grp = df.groupby("id_gasolinera")["precio"]

    df["precio_lag_1"]  = grp.shift(1)
    df["precio_lag_3"]  = grp.shift(3)
    df["precio_lag_7"]  = grp.shift(7)
    df["precio_media_7"] = grp.transform(lambda x: x.shift(1).rolling(7, min_periods=3).mean())

    # Drop rows without enough history for lags
    df = df.dropna(subset=["precio_lag_1", "precio_media_7"])

    logger.info(f"[{fuel_col}] After feature engineering: {len(df):,} usable rows")
    return df


# ── Training ───────────────────────────────────────────────────────────────────

def train_model(fuel_key: str) -> dict:
    """
    Trains a RandomForestRegressor for the given fuel type.
    Returns metrics dict: {mae, baseline_mae, trained_at, n_samples}
    """
    fuel_col = FUEL_COLS[fuel_key]
    logger.info(f"[{fuel_key}] Starting training...")

    df = load_data(fuel_col)

    X = df[FEATURES]
    y = df["precio"]

    # 80/20 split — same as reference script
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds       = model.predict(X_test)
    mae         = mean_absolute_error(y_test, preds)
    baseline_mae = mean_absolute_error(y_test, X_test["precio_lag_1"])

    logger.info(
        f"[{fuel_key}] MAE={mae:.4f} | Baseline(lag_1)={baseline_mae:.4f} | "
        f"Improvement={(baseline_mae - mae):.4f}"
    )

    # Persist model
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = os.path.join(MODELS_DIR, f"{fuel_key}_model.pkl")
    joblib.dump(model, model_path)
    logger.info(f"[{fuel_key}] Model saved → {model_path}")

    # Also persist category encoders for prediction
    encoders = {
        "id_gasolinera": df[["id_gasolinera", "id_gasolinera_num"]].drop_duplicates(),
        "id_municipio":  df[["id_municipio",  "id_municipio_num"]].drop_duplicates(),
        # Store last-known row per station for feature bootstrap
        "last_rows":     df.sort_values("fecha").groupby("id_gasolinera").last().reset_index(),
    }
    enc_path = os.path.join(MODELS_DIR, f"{fuel_key}_encoders.pkl")
    joblib.dump(encoders, enc_path)

    return {
        "fuel":         fuel_key,
        "mae":          round(mae, 4),
        "baseline_mae": round(baseline_mae, 4),
        "n_samples":    len(df),
        "trained_at":   datetime.utcnow().isoformat() + "Z",
    }


def train_all() -> dict:
    """Train RF models for all three fuel types. Returns combined metrics."""
    results = {}
    for fuel_key in FUEL_COLS:
        try:
            results[fuel_key] = train_model(fuel_key)
        except Exception as e:
            logger.error(f"[{fuel_key}] Training failed: {e}")
            results[fuel_key] = {"fuel": fuel_key, "error": str(e)}
    return results
