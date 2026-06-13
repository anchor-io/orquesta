#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/apps/orchestrator
npx node-pg-migrate up -j ts --tsx true --tsconfig tsconfig.json

echo "Starting server..."
exec node build
