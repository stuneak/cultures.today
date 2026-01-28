#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma --config=./prisma/prisma.config.mjs

echo "Starting application..."
exec node server.js
