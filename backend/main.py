import asyncio
import json
import logging
import os
import time
import uuid
from collections import OrderedDict, deque
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import request_validation_exception_handler
from starlette.middleware.trustedhost import TrustedHostMiddleware
from backend.db import initialize, connection
from backend.routers import horizons, presets, scenarios, mission, astronomy, definitions

PRODUCTION = os.getenv('ORRERY_ENV') == 'production'
PUBLIC_URL = os.getenv('PUBLIC_APP_URL', '').rstrip('/')
if PRODUCTION:
    public = urlsplit(PUBLIC_URL)
    if public.scheme != 'https' or not public.hostname or public.username or public.password or public.path or public.query or public.fragment:
        raise RuntimeError('Production requires an HTTPS PUBLIC_APP_URL origin')
origins = [x.strip() for x in os.getenv('ORRERY_ORIGINS', PUBLIC_URL if PRODUCTION else 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173').split(',') if x.strip()]
if PRODUCTION and (not origins or any(not x.startswith('https://') or '*' in x for x in origins)):
    raise RuntimeError('Production requires explicit HTTPS trusted origins')
logger = logging.getLogger('orrery.api')

@asynccontextmanager
async def lifespan(app):
    initialize()
    app.state.horizons_slots = asyncio.Semaphore(2)
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        app.state.http = client
        yield

app = FastAPI(title='Orrery API', version='1.1.0', lifespan=lifespan,
              docs_url=None if PRODUCTION else '/docs',
              redoc_url=None if PRODUCTION else '/redoc',
              openapi_url=None if PRODUCTION else '/openapi.json')
buckets = OrderedDict()
MAX_BYTES = 32 * 1024 * 1024

def safe_log(event, request, status, **extra):
    # Route templates, never share IDs, query strings, body data or header values.
    route = getattr(request.scope.get('route'), 'path', 'unmatched')
    logger.warning(json.dumps({'event':event,'requestId':getattr(request.state,'request_id','unknown'),
                               'method':request.method,'route':route,'status':status,**extra}))

@app.exception_handler(RequestValidationError)
async def invalid_request(request, error):
    if not PRODUCTION:
        return await request_validation_exception_handler(request, error)
    return JSONResponse({'detail':'Invalid request','errors':[{'loc':list(e['loc']), 'type':e['type']} for e in error.errors()]},422)

@app.middleware('http')
async def limits(request: Request, call_next):
    request.state.request_id = uuid.uuid4().hex
    if PRODUCTION and request.url.scheme != 'https' and request.url.path not in ('/api/health','/api/ready'):
        return JSONResponse({'detail':'HTTPS required'},426)
    if request.method in ('POST','PUT','PATCH','DELETE'):
        origin = request.headers.get('origin')
        if origin and origin not in origins:
            return JSONResponse({'detail':'Untrusted origin'},403)
    if request.method != 'OPTIONS' and request.url.path != '/api/ready':
        now = time.monotonic()
        host = request.client.host if request.client else 'unknown'
        queue = buckets.setdefault(host, deque())
        buckets.move_to_end(host)
        while len(buckets)>10000:
            buckets.popitem(last=False)
        while queue and queue[0]<now-60:
            queue.popleft()
        if len(queue)>=120:
            safe_log('rate_limit',request,429)
            return JSONResponse({'detail':'Rate limit: 120 requests/minute'},429,headers={'Retry-After':'60'})
        queue.append(now)
    if request.method in ('POST','PUT','PATCH'):
        chunks, size = [], 0
        try:
            async with asyncio.timeout(30):
                async for chunk in request.stream():
                    size += len(chunk)
                    if size>MAX_BYTES:
                        return JSONResponse({'detail':'Scenario exceeds 32 MB'},413)
                    chunks.append(chunk)
        except TimeoutError:
            return JSONResponse({'detail':'Request body timeout'},408)
        request._body = b''.join(chunks)
    try:
        response = await call_next(request)
    except Exception as error:
        safe_log('api_error',request,500,errorType=type(error).__name__)
        response = JSONResponse({'detail':'Service temporarily unavailable','requestId':request.state.request_id},500)
    if response.status_code>=500:
        safe_log('upstream_or_database_error',request,response.status_code)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Request-ID']=request.state.request_id
    response.headers['X-Robots-Tag']='noindex, nofollow'
    response.headers['Cache-Control']='no-store'
    return response

app.add_middleware(CORSMiddleware, allow_origins=origins,
    allow_methods=['GET','POST','PUT','PATCH','DELETE'],
    allow_headers=['Content-Type','X-Edit-Key'])
hosts=os.getenv('ORRERY_TRUSTED_HOSTS',urlsplit(PUBLIC_URL).hostname+',api,127.0.0.1,localhost' if PRODUCTION else '*').split(',')
if PRODUCTION and '*' in hosts:
    raise RuntimeError('Production cannot trust all Host headers')
app.add_middleware(TrustedHostMiddleware, allowed_hosts=hosts)

@app.get('/api/health')
def health():
    return {'status':'ok','schemaVersion':2}

@app.get('/api/ready')
def ready():
    try:
        with connection() as db:
            db.execute('SELECT id FROM scenarios LIMIT 1').fetchone()
            db.execute('SELECT id FROM mission_definitions LIMIT 1').fetchone()
        return {'status':'ready','schemaVersion':2}
    except Exception:
        return JSONResponse({'status':'unavailable'},503)

app.include_router(horizons.router)
app.include_router(scenarios.router)
app.include_router(presets.router)
app.include_router(mission.router)
app.include_router(astronomy.router)
app.include_router(definitions.router)
