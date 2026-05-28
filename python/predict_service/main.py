"""
main.py — FastAPI prediction microservice
Ports: 8001
Endpoints:
  GET  /health               → service + model status
  POST /train                → trigger model (re)training
  GET  /predict/tomorrow     → national avg price prediction for tomorrow
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from train import train_all
from predict import predict_tomorrow, models_exist, save_meta

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Shared state ───────────────────────────────────────────────────────────────
_training_in_progress = False
_last_train_results: dict = {}


# ── Background training task ───────────────────────────────────────────────────
async def _run_training():
    global _training_in_progress, _last_train_results
    if _training_in_progress:
        logger.warning("Training already in progress — skipped")
        return

    _training_in_progress = True
    logger.info("Starting background training for all fuel types...")
    try:
        results = train_all()
        _last_train_results = results
        # Save meta for each fuel so predictions can report MAE
        for fuel_key, res in results.items():
            if "mae" in res and "trained_at" in res:
                save_meta(fuel_key, res["mae"], res["trained_at"])
        logger.info(f"Training complete: {results}")
    except Exception as e:
        logger.error(f"Training failed: {e}")
    finally:
        _training_in_progress = False


# ── Lifespan: train on startup + schedule daily ────────────────────────────────
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Train on startup if models are missing
    if not models_exist():
        logger.info("No trained models found — training now on startup...")
        await _run_training()
    else:
        logger.info("Trained models found — skipping initial training.")

    # Schedule daily re-training at 02:00 UTC
    scheduler.add_job(_run_training, "cron", hour=2, minute=0, id="daily_retrain")
    scheduler.start()
    logger.info("APScheduler started — daily re-training at 02:00 UTC")

    yield

    scheduler.shutdown()


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Data-Fuel Prediction Service",
    description="Random Forest fuel price prediction for tomorrow",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_ready": models_exist(),
        "training_in_progress": _training_in_progress,
        "last_train_results": _last_train_results or None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """Manually trigger model (re)training in the background."""
    if _training_in_progress:
        raise HTTPException(status_code=409, detail="Training already in progress")
    background_tasks.add_task(_run_training)
    return {"message": "Training started in background", "status": "accepted"}


@app.get("/predict/tomorrow")
async def predict_tomorrow_route():
    """
    Returns predicted national average fuel prices for tomorrow.
    Response shape:
    {
      "date": "2026-05-25",
      "predictions": { "g95": 1.589, "g98": 1.723, "diesel": 1.421 },
      "n_stations": { "g95": 10423, ... },
      "mae": { "g95": 0.0032, ... },
      "trained_at": "2026-05-24T02:00:00Z",
      "training_in_progress": false
    }
    """
    if not models_exist():
        if _training_in_progress:
            raise HTTPException(
                status_code=503,
                detail="Models are still being trained. Try again in a few minutes.",
            )
        raise HTTPException(
            status_code=503,
            detail="Models not trained yet. POST /train to start training.",
        )

    try:
        result = predict_tomorrow()
        result["training_in_progress"] = _training_in_progress
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
