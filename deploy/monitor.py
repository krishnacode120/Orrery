"""Run externally using a timer/monitor; nonzero exit signals an outage."""
import json
import os
import sys
import urllib.request
from urllib.parse import urlparse
origin = os.environ.get('PUBLIC_APP_URL','').rstrip('/')
if urlparse(origin).scheme != 'https':
    raise SystemExit('Set PUBLIC_APP_URL to the HTTPS production origin')
failed = False
for path in ['/', '/api/health']:
    try:
        with urllib.request.urlopen(origin+path, timeout=15) as response:
            if response.status != 200:
                raise RuntimeError('Unexpected status')
            body=response.read(1048576)
            if path.endswith('health') and json.loads(body).get('status') != 'ok':
                raise RuntimeError('API unhealthy')
        print(json.dumps({'path':path,'status':'ok'}))
    except Exception as error:
        failed=True
        print(json.dumps({'path':path,'status':'failed','type':type(error).__name__}))
sys.exit(1 if failed else 0)
