#!/bin/sh
set -e

echo "Starting Leave Management System Backend..."

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "Checking database initialization & running idempotent seed..."
  node -e "import('./dist/database/seed.js').catch(err => { console.warn('Seed notice:', err.message); process.exit(0); })" || true
fi

echo "Starting application server..."
exec node dist/server.js
