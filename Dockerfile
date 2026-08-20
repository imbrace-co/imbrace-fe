# syntax=docker/dockerfile:1
#
# OSS build for imbrace-fe (the IMbrace webapp).
#
# imbrace-fe depends on @imbrace/ui via "file:../imbrace-ui", so the UI
# library is cloned and built first, then placed as a sibling directory
# before the webapp is installed. No private npm registry / token needed
# (unlike the internal build) — set IMBRACE_UI_TOKEN only while the
# imbrace-ui repo is still private.
#
#   docker build \
#     --build-arg VITE_APP_API_HOST=https://your-gateway \
#     --build-arg IMBRACE_UI_TOKEN=<gh-token-if-private> \
#     -t imbrace-fe .

# ─────────────────────────────────────────────────────────────
# Stage 1 — build @imbrace/ui
# ─────────────────────────────────────────────────────────────
# node:20-slim (Debian/glibc) — native build deps like @ast-grep/napi ship
# prebuilt binaries for linux-gnu but not always for alpine/musl.
FROM node:20-slim AS ui-builder
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /src

ARG IMBRACE_UI_REPO=https://github.com/imbraceltd/imbrace-ui.git
ARG IMBRACE_UI_REF=main
ARG IMBRACE_UI_TOKEN=
RUN if [ -n "$IMBRACE_UI_TOKEN" ]; then \
        git clone --depth 1 -b "$IMBRACE_UI_REF" "https://x-access-token:${IMBRACE_UI_TOKEN}@github.com/imbraceltd/imbrace-ui.git" imbrace-ui; \
    else \
        git clone --depth 1 -b "$IMBRACE_UI_REF" "$IMBRACE_UI_REPO" imbrace-ui; \
    fi
WORKDIR /src/imbrace-ui
# vite-plugin-lib-inject-css pulls @ast-grep/napi 0.22.x, whose
# linux-arm64-gnu prebuilt is broken ("undefined symbol: static_assert").
# Force a version with a working arm64 binary. Override is build-only —
# the imbrace-ui repo is left untouched.
RUN node -e "const p=require('./package.json'); p.pnpm=p.pnpm||{}; p.pnpm.overrides=p.pnpm.overrides||{}; p.pnpm.overrides['@ast-grep/napi']='0.32.0'; require('fs').writeFileSync('./package.json', JSON.stringify(p,null,2));"
RUN pnpm install --no-frozen-lockfile && pnpm build

# ─────────────────────────────────────────────────────────────
# Stage 2 — build the webapp
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS app-builder
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /src

# Sibling layout so "file:../imbrace-ui" resolves
COPY --from=ui-builder /src/imbrace-ui ./imbrace-ui

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
# Stage 3 — serve the static build with nginx
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
