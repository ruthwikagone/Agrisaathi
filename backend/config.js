const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(rootDir, '.env'));

function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function pathEnv(names, fallback) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return path.resolve(rootDir, value.trim());
  }
  return fallback;
}

const dataDir = pathEnv(['DATA_DIR'], path.join(rootDir, 'backend', 'data'));
const maxImageBytes = intEnv('MAX_IMAGE_BYTES', 8 * 1024 * 1024);

module.exports = {
  rootDir,
  frontendDir: path.join(rootDir, 'frontend'),
  dataDir,
  uploadsDir: pathEnv(['UPLOADS_DIR', 'UPLOAD_DIR'], path.join(rootDir, 'backend', 'uploads')),
  dbPath: pathEnv(['DATABASE_PATH'], path.join(dataDir, 'agrisaathi.db')),
  port: intEnv('PORT', 3000),
  host: process.env.HOST || '127.0.0.1',
  pythonBin: process.env.PYTHON_BIN || process.env.PYTHON_EXECUTABLE || 'python',
  apiToken: process.env.API_TOKEN || '',
  seedCatalogUrl: process.env.SEED_CATALOG_URL || '',
  weatherProvider: process.env.WEATHER_PROVIDER || 'open-meteo',
  weatherBaseUrl: process.env.WEATHER_BASE_URL || 'https://api.open-meteo.com/v1',
  weatherTimeoutMs: intEnv('WEATHER_TIMEOUT_MS', 10_000),
  // Base64 JSON image uploads expand by roughly 4/3. Keep the default request
  // ceiling large enough for a maximum-size allowed image plus JSON metadata.
  maxJsonBytes: intEnv('MAX_JSON_BYTES', intEnv('MAX_JSON_BODY_BYTES', Math.ceil(maxImageBytes * 4 / 3) + 1024 * 1024)),
  maxImageBytes
};
