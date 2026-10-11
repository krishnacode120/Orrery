"""Vercel Python function: keep the existing FastAPI application authoritative."""
import os
from urllib.parse import urlsplit

os.environ.setdefault('ORRERY_ENV', 'production')
origin = os.getenv('PUBLIC_APP_URL')
if not origin:
    hostname = os.getenv('VERCEL_PROJECT_PRODUCTION_URL') or os.getenv('VERCEL_URL')
    if not hostname:
        raise RuntimeError('Set PUBLIC_APP_URL or Vercel system deployment URL')
    origin = 'https://' + hostname
    os.environ['PUBLIC_APP_URL'] = origin
hosts = {urlsplit(origin).hostname, os.getenv('VERCEL_URL'), os.getenv('VERCEL_PROJECT_PRODUCTION_URL')}
os.environ.setdefault('ORRERY_TRUSTED_HOSTS', ','.join(sorted(x for x in hosts if x)))
os.environ.setdefault('ORRERY_MAX_BYTES', str(4 * 1024 * 1024))
from backend.main import app
