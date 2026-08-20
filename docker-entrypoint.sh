#!/bin/sh
# Emit /usr/share/nginx/html/config.json from VITE_APP_* environment vars so
# the SPA can be re-pointed at a different backend at container start without
# rebuilding. Served at GET /config (see .nginx/nginx.conf); env.ts merges it
# into window.env. If no VITE_APP_* vars are set, an empty {} is written and
# the app falls back to the values baked in at build time.
set -eu

OUT=/usr/share/nginx/html/config.json
TMP="$(mktemp)"

printf '{' > "$TMP"
first=1
# Iterate env var names only (values may contain '='), then look each up.
for key in $(awk 'BEGIN{for (k in ENVIRON) if (k ~ /^VITE_APP_/) print k}' < /dev/null 2>/dev/null || env | sed -n 's/^\(VITE_APP_[A-Za-z0-9_]*\)=.*/\1/p'); do
    # shellcheck disable=SC2086
    eval "val=\${$key}"
    # Escape backslashes and double quotes for JSON safety.
    esc=$(printf '%s' "$val" | sed 's/\\/\\\\/g; s/"/\\"/g')
    if [ "$first" -eq 1 ]; then first=0; else printf ',' >> "$TMP"; fi
    printf '"%s":"%s"' "$key" "$esc" >> "$TMP"
done
printf '}' >> "$TMP"

mv "$TMP" "$OUT"
# mktemp creates 0600; nginx workers run as the unprivileged 'nginx' user
# and must be able to read it, otherwise GET /config returns 403.
chmod 644 "$OUT"
echo "[imbrace] wrote runtime config: $OUT"
