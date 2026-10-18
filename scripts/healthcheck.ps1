# SyncPro Infrastructure Healthcheck Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SyncPro Local Infrastructure Health  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allHealthy = $true

function Test-Component($name, $scriptBlock) {
    Write-Host -NoNewline "[...] Checking $name... "
    try {
        & $scriptBlock
        Write-Host "OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor DarkRed
        return $false
    }
}

# 1. PostgreSQL Check
$pgCheck = Test-Component "PostgreSQL 16 (Port 5432)" {
    $res = docker compose exec -T postgres pg_isready -U syncpro -d syncpro_dev 2>&1
    if ($LASTEXITCODE -ne 0) { throw "pg_isready returned non-zero code ($res)" }
    
    $query = "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
    $queryRes = docker compose exec -T postgres psql -U syncpro -d syncpro_dev -t -A -c $query 2>&1
    if ($LASTEXITCODE -ne 0) { throw "psql test query failed ($queryRes)" }

    $extQuery = "SELECT count(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');"
    $extRaw = docker compose exec -T postgres psql -U syncpro -d syncpro_dev -t -A -c $extQuery 2>&1
    $extStr = ($extRaw | Out-String).Trim()
    $extCount = 0
    if (-not [int]::TryParse($extStr, [ref]$extCount) -or $extCount -lt 2) {
        throw "Required PostgreSQL extensions (uuid-ossp, pgcrypto) not found ($extStr/2 installed)"
    }
}
if (-not $pgCheck) { $allHealthy = $false }

# 2. MinIO Check
$minioCheck = Test-Component "MinIO S3 API (Port 9000)" {
    $endpoint = "http://localhost:9000/minio/health/live"
    $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ne 200) { throw "MinIO health live endpoint returned $($response.StatusCode)" }
    
    # Check buckets directory in MinIO container
    $bucketsRaw = docker compose exec -T minio ls -1 /data 2>&1
    $buckets = ($bucketsRaw | Out-String)
    if ($LASTEXITCODE -ne 0) { throw "MinIO bucket listing failed ($buckets)" }
    if ($buckets -notmatch "syncpro-commits" -or $buckets -notmatch "syncpro-snapshots") {
        throw "Required buckets (syncpro-commits, syncpro-snapshots) not found in MinIO. Found: $buckets"
    }
}
if (-not $minioCheck) { $allHealthy = $false }

# 3. Redis Check
$redisCheck = Test-Component "Redis 7 (Port 6379, AOF/Streams)" {
    $ping = (docker compose exec -T redis redis-cli ping 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $ping -ne "PONG") { throw "Redis ping failed: $ping" }
    
    # Test Redis Stream write/read
    $streamKey = "healthcheck:test_stream"
    $xadd = docker compose exec -T redis redis-cli XADD $streamKey "*" test_event "healthcheck" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Redis XADD failed ($xadd)" }
    
    $xrange = docker compose exec -T redis redis-cli XRANGE $streamKey "-" "+" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Redis XRANGE failed ($xrange)" }
    
    # Clean up test key
    docker compose exec -T redis redis-cli DEL $streamKey | Out-Null
}
if (-not $redisCheck) { $allHealthy = $false }

Write-Host "----------------------------------------" -ForegroundColor Cyan
if ($allHealthy) {
    Write-Host "[SUCCESS] All infrastructure components are healthy and operational!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ERROR] One or more infrastructure components failed healthcheck." -ForegroundColor Red
    exit 1
}
