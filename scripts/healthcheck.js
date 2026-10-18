#!/usr/bin/env node
/**
 * Cross-platform healthcheck for SyncPro infrastructure
 * Usage: node scripts/healthcheck.js
 */
const { execSync } = require('child_process');
const http = require('http');

console.log('========================================');
console.log('   SyncPro Local Infrastructure Health  ');
console.log('========================================');

let allHealthy = true;

function check(name, fn) {
  process.stdout.write(`[...] Checking ${name}... `);
  try {
    fn();
    console.log('\x1b[32mOK\x1b[0m');
    return true;
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`    Error: ${err.message || err}`);
    allHealthy = false;
    return false;
  }
}

// 1. PostgreSQL check
check('PostgreSQL 16 (Port 5432)', () => {
  execSync('docker compose exec -T postgres pg_isready -U syncpro -d syncpro_dev', { stdio: 'pipe' });
  const extCount = execSync(
    'docker compose exec -T postgres psql -U syncpro -d syncpro_dev -t -A -c "SELECT count(*) FROM pg_extension WHERE extname IN (\'uuid-ossp\', \'pgcrypto\');"',
    { encoding: 'utf8', stdio: 'pipe' }
  ).trim();
  if (parseInt(extCount, 10) < 2) {
    throw new Error(`Extensions not ready (${extCount}/2 installed)`);
  }
});

// 2. MinIO check
async function checkMinio() {
  process.stdout.write('[...] Checking MinIO S3 API (Port 9000)... ');
  try {
    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:9000/minio/health/live', (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`HTTP status ${res.statusCode}`));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    });

    const buckets = execSync('docker compose exec -T minio ls -1 /data', { encoding: 'utf8', stdio: 'pipe' });
    if (!buckets.includes('syncpro-commits') || !buckets.includes('syncpro-snapshots')) {
      throw new Error(`Required buckets not found in MinIO: ${buckets}`);
    }
    console.log('\x1b[32mOK\x1b[0m');
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`    Error: ${err.message || err}`);
    allHealthy = false;
  }
}

// 3. Redis check
function checkRedis() {
  check('Redis 7 (Port 6379, AOF/Streams)', () => {
    const ping = execSync('docker compose exec -T redis redis-cli ping', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (ping !== 'PONG') {
      throw new Error(`Unexpected ping response: ${ping}`);
    }
    execSync('docker compose exec -T redis redis-cli XADD healthcheck:test_stream * test_event healthcheck', { stdio: 'pipe' });
    execSync('docker compose exec -T redis redis-cli DEL healthcheck:test_stream', { stdio: 'pipe' });
  });
}

(async () => {
  await checkMinio();
  checkRedis();

  console.log('----------------------------------------');
  if (allHealthy) {
    console.log('\x1b[32m[SUCCESS] All infrastructure components are healthy and operational!\x1b[0m');
    process.exit(0);
  } else {
    console.log('\x1b[31m[ERROR] One or more infrastructure components failed healthcheck.\x1b[0m');
    process.exit(1);
  }
})();
