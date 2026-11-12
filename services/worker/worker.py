"""Run the same durable processors as the API. No HTTP/debug or in-memory fallback."""
import sys,time,logging
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'apps/api'))
from app import create_app
from app.work import run_once
logging.basicConfig(level=logging.INFO)
app=create_app()
if app.db_engine is None:raise RuntimeError('DATABASE_URL is required for the worker')
if __name__=='__main__':
    with app.app_context():
        while True:
            try:worked=run_once()
            except Exception as exc:
                logging.error('Worker iteration failed: %s',type(exc).__name__);worked=False
            if not worked:time.sleep(2)
