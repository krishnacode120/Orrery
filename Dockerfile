# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY site ./site
COPY public ./public
ARG PUBLIC_APP_URL
ARG GIT_COMMIT=unknown
ENV PUBLIC_APP_URL=${PUBLIC_APP_URL} ORRERY_PRODUCTION=1 API_BASE_URL=/api GIT_COMMIT=${GIT_COMMIT}
RUN npm run build

FROM caddy:2.11.7-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend /build/dist /srv
RUN mv /srv/security.caddy /etc/caddy/security.caddy && rm /srv/public-pages.json
EXPOSE 80 443

FROM python:3.13-slim AS api
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ORRERY_DB=/data/orrery.sqlite3
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home orrery && mkdir /data /backups && chown orrery:orrery /data /backups
COPY backend /app/backend
COPY deploy /app/deploy
USER 10001:10001
EXPOSE 8000
CMD ["python","-m","uvicorn","backend.main:app","--host","0.0.0.0","--port","8000","--workers","1","--proxy-headers","--forwarded-allow-ips","172.30.70.10","--no-access-log","--timeout-keep-alive","5","--limit-concurrency","100"]
