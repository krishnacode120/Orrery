import asyncio
import os
import time
from collections import OrderedDict, deque
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.db import initialize
from backend.routers import horizons, presets, scenarios, mission


@asynccontextmanager
async def lifespan(app):
    initialize()
    app.state.horizons_slots = asyncio.Semaphore(2)
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        app.state.http = client
        yield


app = FastAPI(title='Orrery API', version='1.0.0', lifespan=lifespan)
buckets = OrderedDict()
MAX_BYTES = 32 * 1024 * 1024


@app.middleware('http')
async def limits(request: Request, call_next):
    if request.method == 'OPTIONS':
        return await call_next(request)
    now = time.monotonic()
    host = request.client.host if request.client else 'unknown'
    # Single-process limiter. Use an edge/shared limiter before multi-worker deployment.
    queue = buckets.setdefault(host, deque())
    buckets.move_to_end(host)
    while len(buckets) > 10000:
        buckets.popitem(last=False)
    while queue and queue[0] < now-60:
        queue.popleft()
    if len(queue) >= 120:
        return JSONResponse({'detail': 'Rate limit: 120 requests/minute'}, 429, headers={'Retry-After': '60'})
    queue.append(now)
    if request.method in ('POST', 'PUT', 'PATCH'):
        chunks, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BYTES:
                return JSONResponse({'detail': 'Scenario exceeds 32 MB'}, 413)
            chunks.append(chunk)
        request._body = b''.join(chunks)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('ORRERY_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173').split(','),
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Content-Type', 'X-Edit-Key'])


@app.get('/api/health')
def health():
    return {'status': 'ok', 'schemaVersion': 2}


app.include_router(horizons.router)
app.include_router(scenarios.router)
app.include_router(presets.router)
app.include_router(mission.router)
