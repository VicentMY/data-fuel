import joblib
import os
import numpy as np
from datetime import datetime, timedelta, timezone

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
FUEL_KEYS = ["g95", "g98", "diesel"]

print("Starting debug script...")
tomorrow = datetime.now(timezone.utc) + timedelta(days=1)

prov_data = {}

for fuel_key in FUEL_KEYS:
    mp = os.path.join(MODELS_DIR, f"{fuel_key}_model.pkl")
    ep = os.path.join(MODELS_DIR, f"{fuel_key}_encoders.pkl")

    if not os.path.exists(mp) or not os.path.exists(ep):
        print(f"[{fuel_key}] Model or encoders not found")
        continue

    print(f"[{fuel_key}] Loading model and encoders...")
    model = joblib.load(mp)
    encoders = joblib.load(ep)

    last_rows = encoders["last_rows"].copy()
    print(f"[{fuel_key}] last_rows shape: {last_rows.shape}")
    print(f"[{fuel_key}] Unique provinces in last_rows: {last_rows['id_provincia'].nunique()}")

    last_rows["dia_semana"] = tomorrow.weekday()
    last_rows["mes"]        = tomorrow.month
    last_rows["dia_mes"]    = tomorrow.day
    last_rows["semana"]     = int(tomorrow.strftime("%V"))

    last_rows["precio_lag_1"]  = last_rows["precio"]
    last_rows["precio_lag_3"]  = last_rows["precio"]
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

    X = last_rows[FEATURES].dropna()
    print(f"[{fuel_key}] X shape after dropna: {X.shape}")
    print(f"[{fuel_key}] Unique provinces in X: {last_rows.loc[X.index, 'id_provincia'].nunique()}")

    preds = model.predict(X)
    last_rows_pred = last_rows.loc[X.index].copy()
    last_rows_pred["pred"] = preds

    prov_means = last_rows_pred.groupby(["id_provincia", "provincia"])["pred"].mean().reset_index()
    print(f"[{fuel_key}] prov_means rows: {len(prov_means)}")
    print(f"[{fuel_key}] Sample prov_means:\n{prov_means.head()}")

    for _, row in prov_means.iterrows():
        id_prov = row["id_provincia"]
        if id_prov not in prov_data:
            prov_data[id_prov] = {"provincia": row["provincia"]}
        prov_data[id_prov][f"precio_{fuel_key}"] = round(float(row["pred"]), 3)

print(f"Total unique provinces in prov_data: {len(prov_data)}")
print(f"Provinces in prov_data: {list(prov_data.keys())}")
