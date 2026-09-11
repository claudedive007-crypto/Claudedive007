#!/bin/sh
# depends_on/service_healthy usually means Postgres is ready by the time we get here,
# but timing in constrained environments (like a fresh Codespace) isn't guaranteed —
# so retry instead of failing on the first connection attempt.

attempt=0
max_attempts=30

until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database still unreachable after ${max_attempts} attempts (60s) — giving up."
    exit 1
  fi
  echo "Database not ready yet (attempt ${attempt}/${max_attempts}) — retrying in 2s..."
  sleep 2
done

npm run prisma:seed
exec npm run dev
