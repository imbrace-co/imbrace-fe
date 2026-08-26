# syntax=docker/dockerfile:1
#
# OSS build for imbrace-fe (the IMbrace webapp).
#
# @imbrace/ui is installed from the public npm registry, so no token and no
# sibling checkout are needed:
#
#   docker build -t imbrace-fe .

# ─────────────────────────────────────────────────────────────
# Stage 1 — build the webapp
# ─────────────────────────────────────────────────────────────
# node:20-slim (Debian/glibc) — native build deps ship prebuilt binaries for
# linux-gnu but not always for alpine/musl.
FROM node:20-slim AS app-builder
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /src/imbrace-fe

COPY . .
RUN pnpm install --frozen-lockfile

# Vite inlines import.meta.env.VITE_* at build time. The API host is no longer
# baked here — the SPA calls the relative /api (proxied to BACKEND_URL by nginx)
# and the rest of the VITE_APP_* hosts are injected at runtime via /config
# (see docker-entrypoint.sh). Only the env name keeps a sensible default.
ARG VITE_APP_ENV=production
ENV VITE_APP_ENV=$VITE_APP_ENV
RUN pnpm build

# ─────────────────────────────────────────────────────────────
# Stage 2 — serve the static build with nginx
# ─────────────────────────────────────────────────────────────
FROM nginx:alpine
ARG GIT_COMMIT=unspecified
LABEL git_commit=$GIT_COMMIT

# Backend the SPA's /api calls are proxied to. Override at runtime:
#   docker run -e BACKEND_URL=https://app-gateway.example.com ...
ENV BACKEND_URL=http://localhost:9001

# ActivePieces workflow host the SPA's /ap-workflow calls are proxied to.
# Override at runtime: docker run -e APWF_URL=https://apwf.example.com ...
ENV APWF_URL=https://apwf.dev.imbrace.co

# Shipped as a template — nginx:alpine's entrypoint runs envsubst on
# /etc/nginx/templates/*.template and writes the result to conf.d/ at start,
# substituting ${BACKEND_URL} and ${APWF_URL} (nginx's own $vars are left intact).
COPY .nginx/nginx.conf /etc/nginx/templates/default.conf.template
# nginx:alpine runs every executable in /docker-entrypoint.d/ before
# starting the server — used to emit /config from runtime env vars.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-imbrace-config.sh
RUN chmod +x /docker-entrypoint.d/40-imbrace-config.sh

RUN rm -rf /usr/share/nginx/html/*
COPY --from=app-builder /src/imbrace-fe/build /usr/share/nginx/html

EXPOSE 80
