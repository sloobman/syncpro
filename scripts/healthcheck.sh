#!/usr/bin/env bash
set -eo pipefail
export MSYS_NO_PATHCONV=1

echo "========================================"
echo "   SyncPro Local Infrastructure Health  "
echo "========================================"

FAILED=0

# 1. PostgreSQL Check
echo -n "[...] Checking PostgreSQL 16 (Port 5432)... "
if docker compose exec -T postgres pg_isready -U syncpro -d syncpro_dev >/dev/null 2>&1; then
    EXT_COUNT=$(docker compose exec -T postgres psql -U syncpro -d syncpro_dev -t -A -c "SELECT count(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');" 2>/dev/null || echo 0)
    if [ "$EXT_COUNT" -ge 2 ]; then
        echo "OK"
    else
        echo "FAILED (Extensions not installed)"
        FAILED=1
    fi
else
    echo "FAILED (pg_isready check failed)"
    FAILED=1
fi

# 2. MinIO Check
echo -n "[...] Checking MinIO S3 API (Port 9000)... "
if curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1; then
    BUCKETS=$(docker compose exec -T minio ls -1 /data 2>/dev/null || true)
    if echo "$BUCKETS" | grep -q "syncpro-commits" && echo "$BUCKETS" | grep -q "syncpro-snapshots"; then
        echo "OK"
    else
        echo "FAILED (Required buckets not found)"
        FAILED=1
    fi
else
    echo "FAILED (HTTP health endpoint unreachable)"
    FAILED=1
fi

# 3. Redis Check
echo -n "[...] Checking Redis 7 (Port 6379, AOF/Streams)... "
if [ "$(docker compose exec -T redis redis-cli ping 2>/dev/null | tr -d '\r\n')" = "PONG" ]; then
    docker compose exec -T redis redis-cli XADD healthcheck:test_stream "*" test_event "healthcheck" >/dev/null 2>&1
    docker compose exec -T redis redis-cli DEL healthcheck:test_stream >/dev/null 2>&1
    echo "OK"
else
    echo "FAILED (Redis ping failed)"
    FAILED=1
fi

echo "----------------------------------------"
if [ "$FAILED" -eq 0 ]; then
    echo "[SUCCESS] All infrastructure components are healthy and operational!"
    exit 0
else
    echo "[ERROR] One or more infrastructure components failed healthcheck."
    exit 1
fi
