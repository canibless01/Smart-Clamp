"""Run the same durable processors as the API. No HTTP/debug or in-memory fallback."""
import sys,time,logging
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'apps/api'))
from app import create_app
from app.work import run_once
from app.device_experience import check_offline
from app.energy_schedule import process_due,worker_settings
logging.basicConfig(level=logging.INFO)
app=create_app()
if app.db_engine is None:raise RuntimeError('DATABASE_URL is required for the worker')
comparison_batch,comparison_tick=worker_settings(app.config)
if __name__=='__main__':
    with app.app_context():
        next_connection_check=0;next_comparison_check=0
        while True:
            try:
                if time.monotonic()>=next_connection_check:
                    check_offline();next_connection_check=time.monotonic()+30
                if time.monotonic()>=next_comparison_check:
                    process_due(comparison_batch);next_comparison_check=time.monotonic()+comparison_tick
                worked=run_once()
            except Exception as exc:
                logging.error('Worker iteration failed: %s',type(exc).__name__);worked=False
            if not worked:time.sleep(2)
