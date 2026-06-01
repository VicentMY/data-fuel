import os
import sys
import logging
import joblib
import pandas as pd
import psycopg2
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_train")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "data_fuel"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "12344321"),
}

# Features WITHOUT id_gasolinera_num
FEATURES = [
    "id_municipio_num",
    "lat",
    "lon",
    "dia_semana",
    "mes",
    "dia_mes",
    "semana",
    "precio_lag_1",
    "precio_lag_3",
    "precio_lag_7",
    "precio_media_7",
]

def load_data(fuel_col):
    sql = f"""
        SELECT
            id_gasolinera,
            id_municipio,
            id_provincia,
            provincia,
            lat::float,
            lon::float,
            {fuel_col}::float AS precio,
            actualizado::date AS fecha
        FROM estaciones_historico
        WHERE {fuel_col} IS NOT NULL
          AND actualizado IS NOT NULL
          AND lat IS NOT NULL
          AND lon IS NOT NULL
          AND actualizado >= CURRENT_DATE - INTERVAL '30 days'
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
        raise ValueError(f"No data for {fuel_col}")

    df["fecha"] = pd.to_datetime(df["fecha"])
    df["dia_semana"] = df["fecha"].dt.dayofweek
    df["mes"]        = df["fecha"].dt.month
    df["dia_mes"]    = df["fecha"].dt.day
    df["semana"]     = df["fecha"].dt.isocalendar().week.astype(int)

    df["id_municipio_num"] = df["id_municipio"].fillna("0").astype("category").cat.codes

    df = df.sort_values(["id_gasolinera", "fecha"])
    grp = df.groupby("id_gasolinera")["precio"]
    df["precio_lag_1"]  = grp.shift(1)
    df["precio_lag_3"]  = grp.shift(3)
    df["precio_lag_7"]  = grp.shift(7)
    df["precio_media_7"] = grp.transform(lambda x: x.shift(1).rolling(7, min_periods=3).mean())

    df = df.dropna(subset=["precio_lag_1", "precio_media_7"])
    return df

print("Loading G95 data...")
df = load_data("precio_g95")
X = df[FEATURES]
y = df["precio"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training Random Forest on {len(X_train)} samples...")
model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1, max_depth=15) # restrict depth to keep it even smaller
model.fit(X_train, y_train)

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
baseline = mean_absolute_error(y_test, X_test["precio_lag_1"])

print(f"MAE with optimized features: {mae:.4f}")
print(f"Baseline MAE: {baseline:.4f}")

# Save to temporary file to check size
temp_path = "python/predict_service/models/test_g95_model.pkl"
joblib.dump(model, temp_path)
size_mb = os.path.getsize(temp_path) / (1024 * 1024)
print(f"Optimized model file size: {size_mb:.2f} MB")
os.remove(temp_path)
