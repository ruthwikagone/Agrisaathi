const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

const database = new DatabaseSync(config.dbPath);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS farm_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    farmer_name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    farm_area REAL NOT NULL,
    area_unit TEXT NOT NULL DEFAULT 'acre',
    soil_type TEXT,
    soil_ph REAL,
    nitrogen REAL,
    phosphorus REAL,
    potassium REAL,
    current_crop TEXT,
    crop_variety TEXT,
    planting_date TEXT,
    season TEXT,
    water_source TEXT,
    irrigation_method TEXT,
    previous_crop TEXT,
    previous_yield REAL,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS crop_recommendations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_profile_id TEXT REFERENCES farm_profiles(id) ON DELETE SET NULL,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    model_version TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS seed_recommendations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    source TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS disease_analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    result_json TEXT NOT NULL,
    model_version TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS weather_snapshots (
    id TEXT PRIMARY KEY,
    farm_profile_id TEXT REFERENCES farm_profiles(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    observed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS weather_alerts (
    id TEXT PRIMARY KEY,
    farm_profile_id TEXT REFERENCES farm_profiles(id) ON DELETE SET NULL,
    alert_key TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(farm_profile_id, alert_key)
  );
  CREATE TABLE IF NOT EXISTS yield_predictions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    model_version TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS farm_calculations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calculation_type TEXT NOT NULL,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pest_management (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS farm_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL,
    title TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const LOCAL_USER_ID = 'local-farmer';

function now() {
  return new Date().toISOString();
}

function ensureLocalUser() {
  const timestamp = now();
  database.prepare(`
    INSERT INTO users (id, display_name, preferred_language, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(LOCAL_USER_ID, 'Local farmer', 'en', timestamp, timestamp);
}

ensureLocalUser();

function rowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    farmerName: row.farmer_name,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    farmArea: row.farm_area,
    areaUnit: row.area_unit,
    soilType: row.soil_type,
    soilPh: row.soil_ph,
    nitrogen: row.nitrogen,
    phosphorus: row.phosphorus,
    potassium: row.potassium,
    currentCrop: row.current_crop,
    cropVariety: row.crop_variety,
    plantingDate: row.planting_date,
    season: row.season,
    waterSource: row.water_source,
    irrigationMethod: row.irrigation_method,
    previousCrop: row.previous_crop,
    previousYield: row.previous_yield,
    preferredLanguage: row.preferred_language,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getProfile(userId = LOCAL_USER_ID) {
  return rowToProfile(database.prepare('SELECT * FROM farm_profiles WHERE user_id = ?').get(userId));
}

function saveProfile(values, userId = LOCAL_USER_ID) {
  const timestamp = now();
  const existing = getProfile(userId);
  const id = existing?.id || randomUUID();
  const normalized = {
    farmerName: values.farmerName,
    location: values.location,
    latitude: values.latitude,
    longitude: values.longitude,
    farmArea: values.farmArea,
    areaUnit: values.areaUnit || 'acre',
    soilType: values.soilType || null,
    soilPh: values.soilPh ?? null,
    nitrogen: values.nitrogen ?? null,
    phosphorus: values.phosphorus ?? null,
    potassium: values.potassium ?? null,
    currentCrop: values.currentCrop || null,
    cropVariety: values.cropVariety || null,
    plantingDate: values.plantingDate || null,
    season: values.season || null,
    waterSource: values.waterSource || null,
    irrigationMethod: values.irrigationMethod || null,
    previousCrop: values.previousCrop || null,
    previousYield: values.previousYield ?? null,
    preferredLanguage: values.preferredLanguage || 'en'
  };
  database.prepare(`
    INSERT INTO farm_profiles (
      id, user_id, farmer_name, location, latitude, longitude, farm_area, area_unit, soil_type, soil_ph,
      nitrogen, phosphorus, potassium, current_crop, crop_variety, planting_date, season, water_source,
      irrigation_method, previous_crop, previous_yield, preferred_language, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      farmer_name=excluded.farmer_name, location=excluded.location, latitude=excluded.latitude,
      longitude=excluded.longitude, farm_area=excluded.farm_area, area_unit=excluded.area_unit,
      soil_type=excluded.soil_type, soil_ph=excluded.soil_ph, nitrogen=excluded.nitrogen,
      phosphorus=excluded.phosphorus, potassium=excluded.potassium, current_crop=excluded.current_crop,
      crop_variety=excluded.crop_variety, planting_date=excluded.planting_date, season=excluded.season,
      water_source=excluded.water_source, irrigation_method=excluded.irrigation_method,
      previous_crop=excluded.previous_crop, previous_yield=excluded.previous_yield,
      preferred_language=excluded.preferred_language, updated_at=excluded.updated_at
  `).run(id, userId, normalized.farmerName, normalized.location, normalized.latitude, normalized.longitude,
    normalized.farmArea, normalized.areaUnit, normalized.soilType, normalized.soilPh, normalized.nitrogen,
    normalized.phosphorus, normalized.potassium, normalized.currentCrop, normalized.cropVariety,
    normalized.plantingDate, normalized.season, normalized.waterSource, normalized.irrigationMethod,
    normalized.previousCrop, normalized.previousYield, normalized.preferredLanguage, existing?.createdAt || timestamp, timestamp);
  database.prepare('UPDATE users SET display_name = ?, preferred_language = ?, updated_at = ? WHERE id = ?')
    .run(normalized.farmerName, normalized.preferredLanguage, timestamp, userId);
  return getProfile(userId);
}

function updateProfileLanguage(language, userId = LOCAL_USER_ID) {
  const timestamp = now();
  const result = database.prepare(`
    UPDATE farm_profiles
    SET preferred_language = ?, updated_at = ?
    WHERE user_id = ?
  `).run(language, timestamp, userId);
  if (!result.changes) return null;
  database.prepare('UPDATE users SET preferred_language = ?, updated_at = ? WHERE id = ?')
    .run(language, timestamp, userId);
  return getProfile(userId);
}

function saveHistory(recordType, title, data, userId = LOCAL_USER_ID) {
  const id = randomUUID();
  const createdAt = now();
  database.prepare('INSERT INTO farm_history (id, user_id, record_type, title, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, recordType, title, JSON.stringify(data), createdAt);
  return id;
}

function listHistory(limit = 50, userId = LOCAL_USER_ID) {
  return database.prepare('SELECT * FROM farm_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit)
    .map((row) => ({ id: row.id, type: row.record_type, title: row.title, data: JSON.parse(row.data_json), createdAt: row.created_at }));
}

function insert(table, row) {
  const keys = Object.keys(row);
  const marks = keys.map(() => '?').join(', ');
  database.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${marks})`).run(...keys.map((key) => row[key]));
}

function isHealthy() {
  database.prepare('SELECT 1 AS ok').get();
  return true;
}

function close() {
  database.close();
}

module.exports = {
  database, LOCAL_USER_ID, now, getProfile, saveProfile, updateProfileLanguage, saveHistory, listHistory, insert, isHealthy, close
};
