#!/bin/sh
set -e

# Debug logging
echo "Debug: Starting env.json generation" > /tmp/debug.log

# Copy .env file and log contents
cat /usr/share/nginx/html/env > /tmp/env
echo "Debug: Contents of /tmp/env:" >> /tmp/debug.log
cat /tmp/env >> /tmp/debug.log

# Start JSON output
echo "{" > /usr/share/nginx/html/env.json

# Process .env file and export variables for nginx template
first=1
cat /tmp/env | grep -v '^#' | grep -v '^$' | while IFS='=' read -r key value; do
    # Trim spaces and strip quotes
    key=$(echo "$key" | sed 's/^[ \t]*//;s/[ \t]*$//;s/^"//;s/"$//')
    value=$(echo "$value" | sed 's/^[ \t]*//;s/[ \t]*$//;s/^"//;s/"$//')
    echo "Debug: key=$key, value=$value" >> /tmp/debug.log
    # Check for non-empty key and value
    if [ -n "$key" ] && [ -n "$value" ]; then
        if [ $first -eq 1 ]; then
            echo "\"$key\":\"$value\"" >> /usr/share/nginx/html/env.json
            first=0
        else
            echo ",\"$key\":\"$value\"" >> /usr/share/nginx/html/env.json
        fi
    fi
done

# Close JSON
echo "}" >> /usr/share/nginx/html/env.json

# Log final env.json
echo "Debug: Contents of env.json:" >> /tmp/debug.log
cat /usr/share/nginx/html/env.json >> /tmp/debug.log

# Start Nginx
nginx -g "daemon off;"
