"""
predict.py — Load trained RF models and predict tomorrow's national average price.
"""

import os
import logging
from datetime import datetime, timedelta, timezone

import numpy as np
import joblib
import psycopg2
from psycopg2.extras import execute_values

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

FUEL_KEYS = ["g95", "g98", "diesel"]


def _model_path(fuel_key: str) -> str:
    return os.path.join(MODELS_DIR, f"{fuel_key}_model.pkl")


def _enc_path(fuel_key: str) -> str:
    return os.path.join(MODELS_DIR, f"{fuel_key}_encoders.pkl")


def models_exist() -> bool:
    """True if all three models are present on disk."""
    return all(os.path.exists(_model_path(k)) for k in FUEL_KEYS)


def predict_tomorrow() -> dict:
    """
    Returns the predicted national average price for each fuel type tomorrow.

    Strategy:
    - Load the last_rows (most recent data per station) from the encoders file.
    - Build feature rows for "tomorrow" using temporal features + lag_1=today's price.
    - Run RF model on each row, then take the mean → national average prediction.
    """
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    tomorrow_date = tomorrow.strftime("%Y-%m-%d")
    results: dict = {
        "date": tomorrow_date,
        "predictions": {},
        "trained_at": None,
        "n_stations": {},
        "mae": {},
    }

    # Para acumular columnas por provincia
    prov_data = {}

    for fuel_key in FUEL_KEYS:
        mp = _model_path(fuel_key)
        ep = _enc_path(fuel_key)

        if not os.path.exists(mp) or not os.path.exists(ep):
            logger.warning(f"[{fuel_key}] Model not found — run /train first")
            results["predictions"][fuel_key] = None
            continue

        model    = joblib.load(mp)
        encoders = joblib.load(ep)

        last_rows = encoders["last_rows"].copy()

        # ── Build feature matrix for tomorrow ─────────────────────────────────
        last_rows["dia_semana"] = tomorrow.weekday()
        last_rows["mes"]        = tomorrow.month
        last_rows["dia_mes"]    = tomorrow.day
        last_rows["semana"]     = int(tomorrow.strftime("%V"))

        # lag_1 = today's actual price (price in last_rows["precio"])
        last_rows["precio_lag_1"]  = last_rows["precio"]
        last_rows["precio_lag_3"]  = last_rows["precio"]   # best available
        last_rows["precio_lag_7"]  = last_rows["precio"]
        last_rows["precio_media_7"] = last_rows["precio"]

        FEATURES = [
            "id_gasolinera_num",
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

        # Store results for DB insert
        prov_preds = []

        X = last_rows[FEATURES].dropna()

        if X.empty:
            logger.warning(f"[{fuel_key}] No valid rows for prediction after dropping NaN")
            results["predictions"][fuel_key] = None
            continue

        preds = model.predict(X)
        mean_pred = float(np.mean(preds))
        
        # Add predictions back to last_rows to group by province
        last_rows_pred = last_rows.loc[X.index].copy()
        last_rows_pred["pred"] = preds
        
        # Calculate mean prediction per province
        prov_means = last_rows_pred.groupby(["id_provincia", "provincia"])["pred"].mean().reset_index()

        results["predictions"][fuel_key] = round(mean_pred, 3)
        results["n_stations"][fuel_key]   = len(X)

        # Extract MAE from encoder metadata if stored
        meta_path = os.path.join(MODELS_DIR, f"{fuel_key}_meta.pkl")
        mae_val = None
        if os.path.exists(meta_path):
            meta = joblib.load(meta_path)
            mae_val = meta.get("mae")
            results["mae"][fuel_key]       = mae_val
            results["trained_at"]          = meta.get("trained_at")

        logger.info(
            f"[{fuel_key}] Predicted tomorrow avg: {mean_pred:.3f} "
            f"(from {len(X)} stations)"
        )
        
        for _, row in prov_means.iterrows():
            id_prov = row["id_provincia"]
            if id_prov not in prov_data:
                prov_data[id_prov] = {"provincia": row["provincia"]}
            prov_data[id_prov][f"precio_{fuel_key}"] = round(float(row["pred"]), 3)
            prov_data[id_prov][f"mae_{fuel_key}"] = round(mae_val, 4) if mae_val is not None else None

    # Save to DB outside the loop
    if prov_data:
        DB_CONFIG = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", 5432)),
            "dbname": os.getenv("DB_NAME", "data_fuel"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", "12344321"),
        }
        conn = psycopg2.connect(**DB_CONFIG)
        try:
            cur = conn.cursor()
            records = []
            for id_prov, data in prov_data.items():
                records.append((
                    id_prov,
                    data["provincia"],
                    tomorrow_date,
                    data.get("precio_g95"),
                    data.get("precio_g98"),
                    data.get("precio_diesel"),
                    data.get("mae_g95"),
                    data.get("mae_g98"),
                    data.get("mae_diesel")
                ))
            
            insert_query = """
                INSERT INTO predicciones_provincia (
                    id_provincia, provincia, fecha,
                    precio_g95, precio_g98, precio_diesel,
                    mae_g95, mae_g98, mae_diesel
                )
                VALUES %s
                ON CONFLICT (id_provincia, fecha) DO UPDATE SET
                    provincia = EXCLUDED.provincia,
                    precio_g95 = EXCLUDED.precio_g95,
                    precio_g98 = EXCLUDED.precio_g98,
                    precio_diesel = EXCLUDED.precio_diesel,
                    mae_g95 = EXCLUDED.mae_g95,
                    mae_g98 = EXCLUDED.mae_g98,
                    mae_diesel = EXCLUDED.mae_diesel,
                    creado_en = CURRENT_TIMESTAMP
            """
            execute_values(cur, insert_query, records)
            conn.commit()
            cur.close()
            logger.info(f"Saved {len(records)} combined province predictions to database")
        except Exception as e:
            logger.error(f"Error saving predictions to DB: {e}")
        finally:
            conn.close()

    return results

def save_meta(fuel_key: str, mae: float, trained_at: str):
    """Persist lightweight metadata alongside the model."""
    meta_path = os.path.join(MODELS_DIR,f"{fuel_key}_meta.pkl")
    joblib.dump({"mae": mae, "trained_at": trained_at}, meta_path)


def predict_station_tomorrow(station_id: str, last_prices: dict) -> dict:
    """
    Ajusta la predicción nacional usando el último precio conocido de la estación específica.
    """
    nacional = predict_tomorrow()

    # Precios promedio de ayer (base para calcular delta)
    # Usamos la predicción como tendencia, pero aplicamos el delta desde el último precio real.

    prediccion_ajustada = {}

    # Mapeo de keys de precios (station) a keys de modelo (predict_tomorrow)
    mapping = {'g95': 'g95', 'g98': 'g98', 'diesel': 'diesel'}

    for station_key, national_key in mapping.items():
        price = last_prices.get(station_key)
        nat_pred = nacional['predictions'].get(national_key)

        if price is not None and nat_pred is not None:
            # Aproximación: station_pred = station_price + (nat_pred - nat_avg_today)
            # Como no tenemos nat_avg_today exacto fácilmente, usamos una aproximación 
            # de tendencia (delta) sobre el precio de la estación.
            prediccion_ajustada[station_key] = round(price + (nat_pred - price) * 0.05, 3) 
        else:
            prediccion_ajustada[station_key] = nat_pred

    return prediccion_ajustada

