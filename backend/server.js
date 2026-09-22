const ALLOWED_ORIGIN = 'http://localhost:5173';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { URL } = require('node:url');
const config = require('./config');
const { AppError, assert } = require('./errors');
const db = require('./db');
const weatherService = require('./services/weather');
const { buildWeatherAlerts, buildFarmPlan, irrigationAdvice, fertilizerAdvice, generalPestManagement } = require('./services/agronomy');
const { farmCalculation, pesticideCalculation } = require('./services/calculators');
const { cropPredict, diseasePredict, modelHealth } = require('./services/models');
const { getSeedRecommendations } = require('./services/seed');
const { askCopilot } = require('./services/copilot');
const { predictYield } = require('./services/yieldModel');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8'
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
 res.writeHead(status, {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin'
});
  res.end(body);
}

function success(res, data, status = 200) {
  sendJson(res, status, { ok: true, data });
}

function failure(res, error) {
  const appError = error instanceof AppError ? error : new AppError(500, 'INTERNAL_ERROR', 'The server could not complete the request.');
  sendJson(res, appError.status, { ok: false, error: { code: appError.code, message: appError.message, ...(appError.details ? { details: appError.details } : {}) } });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > config.maxJsonBytes) {
      reject(new AppError(413, 'REQUEST_TOO_LARGE', `Request must be smaller than ${config.maxJsonBytes} bytes.`));
      return;
    }
    const parts = [];
    let received = 0;
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > config.maxJsonBytes) {
        reject(new AppError(413, 'REQUEST_TOO_LARGE', `Request must be smaller than ${config.maxJsonBytes} bytes.`));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on('end', () => {
      if (!parts.length) return resolve({});
      try {
        const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
        if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Expected a JSON object');
        resolve(value);
      } catch (error) {
        reject(new AppError(400, 'INVALID_JSON', 'Request body must be a valid JSON object.', { reason: error.message }));
      }
    });
    req.on('error', reject);
  });
}

function numberValue(value, name, { required = false, min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(422, 'VALIDATION_ERROR', `${name} is required.`);
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new AppError(422, 'VALIDATION_ERROR', `${name} must be a number between ${min} and ${max}.`);
  }
  return number;
}

function textValue(value, name, { required = false, max = 200 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new AppError(422, 'VALIDATION_ERROR', `${name} is required.`);
    return null;
  }
  if (typeof value !== 'string') throw new AppError(422, 'VALIDATION_ERROR', `${name} must be text.`);
  const text = value.trim();
  if (!text && required) throw new AppError(422, 'VALIDATION_ERROR', `${name} is required.`);
  if (text.length > max) throw new AppError(422, 'VALIDATION_ERROR', `${name} must be at most ${max} characters.`);
  return text || null;
}

function validateProfile(input) {
  const language = textValue(input.preferredLanguage, 'preferredLanguage', { max: 5 }) || 'en';
  assert(['en', 'te', 'hi'].includes(language), 422, 'VALIDATION_ERROR', 'preferredLanguage must be en, te, or hi.');
  const areaUnit = textValue(input.areaUnit, 'areaUnit', { max: 20 }) || 'acre';
  assert(['acre', 'hectare'].includes(areaUnit), 422, 'VALIDATION_ERROR', 'areaUnit must be acre or hectare.');
  return {
    farmerName: textValue(input.farmerName, 'farmerName', { required: true, max: 100 }),
    location: textValue(input.location, 'location', { required: true, max: 200 }),
    latitude: numberValue(input.latitude, 'latitude', { required: true, min: -90, max: 90 }),
    longitude: numberValue(input.longitude, 'longitude', { required: true, min: -180, max: 180 }),
    farmArea: numberValue(input.farmArea, 'farmArea', { required: true, min: 0.001, max: 100000 }),
    areaUnit, soilType: textValue(input.soilType, 'soilType', { max: 100 }),
    soilPh: numberValue(input.soilPh, 'soilPh', { min: 0, max: 14 }),
    nitrogen: numberValue(input.nitrogen, 'nitrogen', { min: 0, max: 10000 }),
    phosphorus: numberValue(input.phosphorus, 'phosphorus', { min: 0, max: 10000 }),
    potassium: numberValue(input.potassium, 'potassium', { min: 0, max: 10000 }),
    currentCrop: textValue(input.currentCrop, 'currentCrop', { max: 100 }),
    cropVariety: textValue(input.cropVariety, 'cropVariety', { max: 100 }),
    plantingDate: textValue(input.plantingDate, 'plantingDate', { max: 10 }),
    season: textValue(input.season, 'season', { max: 50 }),
    waterSource: textValue(input.waterSource, 'waterSource', { max: 100 }),
    irrigationMethod: textValue(input.irrigationMethod, 'irrigationMethod', { max: 100 }),
    previousCrop: textValue(input.previousCrop, 'previousCrop', { max: 100 }),
    previousYield: numberValue(input.previousYield, 'previousYield', { min: 0, max: 1000000 }),
    preferredLanguage: language
  };
}

function requireAuth(req) {
  if (!config.apiToken) return;
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (supplied !== config.apiToken) throw new AppError(401, 'UNAUTHORIZED', 'Valid bearer authentication is required.');
}

function requireProfile() {
  const profile = db.getProfile();
  if (!profile) throw new AppError(422, 'FARM_PROFILE_REQUIRED', 'Save the central Farm Profile before using this feature.');
  return profile;
}

function persistWeather(profile, weather) {
  db.insert('weather_snapshots', {
    id: randomUUID(), farm_profile_id: profile.id, source: weather.source,
    payload_json: JSON.stringify(weather), observed_at: weather.lastUpdated
  });
}

function persistAlerts(profile, alerts) {
  const statement = db.database.prepare(`
    INSERT INTO weather_alerts (id, farm_profile_id, alert_key, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(farm_profile_id, alert_key) DO UPDATE SET payload_json = excluded.payload_json, created_at = excluded.created_at
  `);
  const timestamp = db.now();
  for (const alert of alerts) statement.run(randomUUID(), profile.id, alert.key, JSON.stringify(alert), timestamp);
}

function cropInputs(input, profile, weather) {
  const temperature = input.temperature ?? input.ambientTemperature ?? weather?.current?.temperature;
  const humidity = input.humidity ?? weather?.current?.humidity;
  const rainfall = input.rainfall ?? weather?.daily?.[0]?.rainfall;
  return {
    N: numberValue(input.N ?? input.nitrogen ?? profile.nitrogen, 'nitrogen', { required: true, min: 0, max: 10000 }),
    P: numberValue(input.P ?? input.phosphorus ?? profile.phosphorus, 'phosphorus', { required: true, min: 0, max: 10000 }),
    K: numberValue(input.K ?? input.potassium ?? profile.potassium, 'potassium', { required: true, min: 0, max: 10000 }),
    temperature: numberValue(temperature, 'temperature', { required: true, min: -50, max: 70 }),
    humidity: numberValue(humidity, 'humidity', { required: true, min: 0, max: 100 }),
    ph: numberValue(input.ph ?? input.soilPh ?? profile.soilPh, 'ph', { required: true, min: 0, max: 14 }),
    rainfall: numberValue(rainfall, 'rainfall', { required: true, min: 0, max: 3000 }),
    // These fields are stored with the request for traceability, but are not
    // silently passed into the current seven-feature crop model.
    location: textValue(input.location ?? profile.location, 'location', { max: 200 }),
    soilType: textValue(input.soilType ?? profile.soilType, 'soilType', { max: 100 }),
    season: textValue(input.season ?? profile.season, 'season', { max: 50 }),
    waterAvailability: textValue(input.waterAvailability ?? profile.waterSource, 'waterAvailability', { max: 100 }),
    farmSize: numberValue(input.farmSize ?? input.farmArea ?? profile.farmArea, 'farmSize', { min: 0.001, max: 100000 })
  };
}

function fertilizerInputs(input, profile) {
  return {
    crop: textValue(input.crop ?? input.currentCrop ?? profile.currentCrop, 'crop', { required: true, max: 100 }),
    growthStage: textValue(input.growthStage ?? input.cropStage, 'growthStage', { max: 100 }),
    nitrogen: numberValue(input.nitrogen ?? profile.nitrogen, 'nitrogen', { min: 0, max: 10000 }),
    phosphorus: numberValue(input.phosphorus ?? profile.phosphorus, 'phosphorus', { min: 0, max: 10000 }),
    potassium: numberValue(input.potassium ?? profile.potassium, 'potassium', { min: 0, max: 10000 })
  };
}

function pestManagementInputs(input, profile) {
  return {
    crop: textValue(input.crop ?? input.currentCrop ?? profile.currentCrop, 'crop', { required: true, max: 100 }),
    problem: textValue(input.problem, 'problem', { required: true, max: 1000 })
  };
}

function cropRecommendationExplanation(values) {
  return `Ranked from the submitted N (${values.N}), P (${values.P}), K (${values.K}), temperature (${values.temperature}), humidity (${values.humidity}), pH (${values.ph}), and rainfall (${values.rainfall}) values. Location, soil type, season, water availability, and farm size are recorded as context but are not features in the current crop model.`;
}

function addCropRecommendationExplanations(result, values) {
  if (!Array.isArray(result?.recommendations)) return result;
  const explanation = cropRecommendationExplanation(values);
  return {
    ...result,
    recommendations: result.recommendations.map((recommendation) => ({ ...recommendation, explanation }))
  };
}

function matchesImageSignature(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

function fileFromDataUrl(input) {
  const mimeType = textValue(input.mimeType, 'mimeType', { required: true, max: 100 });
  const allowed = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  assert(allowed[mimeType], 415, 'UNSUPPORTED_IMAGE_TYPE', 'Only JPEG, PNG, and WebP images are accepted.');
  const fileName = textValue(input.fileName, 'fileName', { required: true, max: 200 });
  const data = textValue(input.imageBase64, 'imageBase64', { required: true, max: Math.ceil(config.maxImageBytes * 1.38) + 1000 });
  let encoded = data;
  if (data.startsWith('data:')) {
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(data);
    assert(match && match[1].toLowerCase() === mimeType, 422, 'INVALID_IMAGE', 'Image data does not match the declared image type.');
    encoded = match[2];
  }
  const compactEncoded = encoded.replace(/[\r\n]/g, '');
  assert(/^[A-Za-z0-9+/=]+$/.test(compactEncoded), 422, 'INVALID_IMAGE', 'Image data is not valid Base64.');
  const buffer = Buffer.from(compactEncoded, 'base64');
  const canonical = buffer.toString('base64').replace(/=+$/, '');
  assert(canonical === compactEncoded.replace(/=+$/, ''), 422, 'INVALID_IMAGE', 'Image data is not valid Base64.');
  assert(buffer.length > 0 && buffer.length <= config.maxImageBytes, 413, 'IMAGE_TOO_LARGE', `Image must be no larger than ${config.maxImageBytes} bytes.`);
  assert(matchesImageSignature(buffer, mimeType), 422, 'INVALID_IMAGE', 'Image content does not match the declared image type.');
  const tempPath = path.join(config.uploadsDir, `${randomUUID()}${allowed[mimeType]}`);
  fs.writeFileSync(tempPath, buffer, { flag: 'wx' });
  return { tempPath, fileName, mimeType, size: buffer.length };
}

async function api(req, res, method, pathname) {
  requireAuth(req);
  if (method === 'GET' && pathname === '/api/health') {
    const database = (() => { try { db.isHealthy(); return { status: 'healthy' }; } catch (error) { return { status: 'unhealthy', detail: error.message }; } })();
    const weather = await weatherService.probe();
    const ml = modelHealth();
    const ai = { status: 'available', provider: 'local-intent-routing' };
    success(res, { backend: { status: 'healthy' }, database, weather, ai, ml, checkedAt: new Date().toISOString() });
    return;
  }
  if (method === 'GET' && pathname === '/api/ml/health') {
    const ml = modelHealth();
    success(res, {
      ...ml,
      checkedAt: new Date().toISOString(),
      modelVersion: { crop: ml.crop.modelVersion, disease: ml.disease.modelVersion },
      classes: { crop: ml.crop.classes, disease: ml.disease.classes }
    });
    return;
  }
  if (method === 'GET' && pathname === '/api/profile') {
    success(res, { profile: db.getProfile() });
    return;
  }
  if (method === 'PUT' && pathname === '/api/profile') {
    const profile = db.saveProfile(validateProfile(await readJson(req)));
    db.saveHistory('farm_profile', 'Farm profile saved', { profileId: profile.id, location: profile.location });
    success(res, { profile });
    return;
  }
  if (method === 'PATCH' && pathname === '/api/profile') {
    requireProfile();
    const input = await readJson(req);
    const keys = Object.keys(input);
    assert(keys.length === 1 && keys[0] === 'preferredLanguage', 422, 'VALIDATION_ERROR', 'Only preferredLanguage can be updated with PATCH /api/profile.');
    const language = textValue(input.preferredLanguage, 'preferredLanguage', { required: true, max: 5 });
    assert(['en', 'te', 'hi'].includes(language), 422, 'VALIDATION_ERROR', 'preferredLanguage must be en, te, or hi.');
    const profile = db.updateProfileLanguage(language);
    db.saveHistory('farm_profile_language', 'Farm profile language updated', { profileId: profile.id, preferredLanguage: language });
    success(res, { profile });
    return;
  }
  if (method === 'GET' && pathname === '/api/weather') {
    const profile = requireProfile();
    const weather = await weatherService.getWeather(profile);
    persistWeather(profile, weather);
    success(res, weather);
    return;
  }
  if (method === 'GET' && pathname === '/api/alerts') {
    const profile = requireProfile();
    const weather = await weatherService.getWeather(profile);
    const alerts = buildWeatherAlerts(weather);
    persistAlerts(profile, alerts);
    success(res, { source: weather.source, lastUpdated: weather.lastUpdated, alerts });
    return;
  }
  if (method === 'GET' && pathname === '/api/plan') {
    const profile = requireProfile();
    const weather = await weatherService.getWeather(profile);
    const plan = buildFarmPlan(profile, weather);
    db.saveHistory('farm_plan', "Today's farm plan generated", { actionCount: plan.actions.length, weatherObservedAt: weather.current?.observedAt });
    success(res, plan);
    return;
  }
  if (method === 'GET' && pathname === '/api/history') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));
    success(res, { records: db.listHistory(limit) });
    return;
  }
  if (method === 'POST' && pathname === '/api/crop/recommendations') {
    const profile = requireProfile();
    const input = await readJson(req);
    let weather = null;
    if ((input.temperature === undefined && input.ambientTemperature === undefined) || input.humidity === undefined || input.rainfall === undefined) {
      weather = await weatherService.getWeather(profile);
    }
    const values = cropInputs(input, profile, weather);
    const result = addCropRecommendationExplanations(cropPredict(values), values);
    const record = { input: values, result, weatherBasis: weather ? { source: weather.source, lastUpdated: weather.lastUpdated } : null };
    db.insert('crop_recommendations', { id: randomUUID(), user_id: db.LOCAL_USER_ID, farm_profile_id: profile.id, input_json: JSON.stringify(values), result_json: JSON.stringify(record), model_version: result.model?.version || result.modelVersion || null, created_at: db.now() });
    db.saveHistory('crop_recommendation', 'Crop recommendation generated', record);
    success(res, record, 201);
    return;
  }
  if (method === 'GET' && pathname === '/api/seed/catalog') {
const varieties = [
  {
    crop: 'cotton',
    variety: 'Bt Cotton',
    region: 'Telangana',
    durationDays: 160,
    seedRequirement: '1.5–2 kg/acre',
    expectedYield: '8–12 quintals/acre',
    price: 900,
    priceUnit: 'per 450 g packet',
    priceType: 'indicative MRP',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Suitable for cotton cultivation in Telangana during Kharif with adequate water availability.'
  },
  {
    crop: 'cotton',
    variety: 'Hybrid Cotton',
    region: 'Telangana',
    durationDays: 165,
    seedRequirement: '1.5–2 kg/acre',
    expectedYield: '9–13 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Hybrid cotton option for Kharif cultivation with good water availability.'
  },
  {
    crop: 'cotton',
    variety: 'Long Staple Cotton',
    region: 'Telangana',
    durationDays: 170,
    seedRequirement: '1.5–2 kg/acre',
    expectedYield: '8–12 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Long-staple option for farmers targeting cotton fibre quality.'
  },

  {
    crop: 'rice',
    variety: 'BPT 5204',
    region: 'Telangana',
    durationDays: 150,
    seedRequirement: '20–25 kg/acre',
    expectedYield: '20–25 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Established paddy variety listed by Telangana State Seeds Development Corporation.'
  },
  {
    crop: 'rice',
    variety: 'MTU 1010',
    region: 'Telangana',
    durationDays: 120,
    seedRequirement: '20–25 kg/acre',
    expectedYield: '18–25 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Widely used paddy variety suitable for Telangana cultivation.'
  },
  {
    crop: 'rice',
    variety: 'RNR 15048',
    region: 'Telangana',
    durationDays: 130,
    seedRequirement: '20–25 kg/acre',
    expectedYield: '20–28 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Telangana-listed paddy variety suitable for local growing conditions.'
  },

  {
    crop: 'maize',
    variety: 'DHM 206',
    region: 'Telangana',
    durationDays: 100,
    seedRequirement: '7–8 kg/acre',
    expectedYield: '25–35 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'ICAR',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Maize variety referenced in recent ICAR seed allocation information.'
  },
  {
    crop: 'maize',
    variety: 'Hybrid Maize',
    region: 'Telangana',
    durationDays: 100,
    seedRequirement: '7–8 kg/acre',
    expectedYield: '25–35 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Hybrid option for farmers seeking higher maize productivity.'
  },

  {
    crop: 'groundnut',
    variety: 'K-6',
    region: 'Telangana',
    durationDays: 110,
    seedRequirement: '70–80 kg/acre',
    expectedYield: '8–12 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Groundnut K-6 is listed in Telangana seed production information.'
  },
  {
    crop: 'groundnut',
    variety: 'Kadri Lepakshi',
    region: 'Telangana',
    durationDays: 110,
    seedRequirement: '70–80 kg/acre',
    expectedYield: '8–12 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'ICAR',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Groundnut variety identified in recent ICAR seed allocation information.'
  },

  {
    crop: 'redgram',
    variety: 'LRG 52',
    region: 'Telangana',
    durationDays: 160,
    seedRequirement: '8–10 kg/acre',
    expectedYield: '6–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'ICAR',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Pigeonpea variety referenced in recent ICAR agricultural seed allocation.'
  },
  {
    crop: 'redgram',
    variety: 'WRG 93',
    region: 'Telangana',
    durationDays: 165,
    seedRequirement: '8–10 kg/acre',
    expectedYield: '6–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Redgram variety appearing in Telangana State Seeds Development Corporation records.'
  },
  {
    crop: 'redgram',
    variety: 'WRG 97',
    region: 'Telangana',
    durationDays: 170,
    seedRequirement: '8–10 kg/acre',
    expectedYield: '6–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Redgram variety recorded in Telangana seed information.'
  },

  {
    crop: 'greengram',
    variety: 'Green Gram Certified Seed',
    region: 'Telangana',
    durationDays: 65,
    seedRequirement: '8–10 kg/acre',
    expectedYield: '4–7 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Green gram is included among Telangana seed production crops.'
  },

  {
    crop: 'blackgram',
    variety: 'Blackgram Certified Seed',
    region: 'Telangana',
    durationDays: 70,
    seedRequirement: '8–10 kg/acre',
    expectedYield: '4–7 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Blackgram is included among Telangana seed production crops.'
  },

  {
    crop: 'bengalgram',
    variety: 'JG-11',
    region: 'Telangana',
    durationDays: 110,
    seedRequirement: '35–40 kg/acre',
    expectedYield: '6–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'JG-11 is listed in Telangana seed production information for Bengal gram.'
  },

  {
    crop: 'jowar',
    variety: 'Jowar Variety / Hybrid',
    region: 'Telangana',
    durationDays: 100,
    seedRequirement: '3–4 kg/acre',
    expectedYield: '8–12 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Jowar is included in Telangana seed production programs.'
  },

  {
    crop: 'bajra',
    variety: 'Bajra Certified Seed',
    region: 'Telangana',
    durationDays: 80,
    seedRequirement: '1.5–2 kg/acre',
    expectedYield: '8–12 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Bajra is included in Telangana seed production information.'
  },

  {
    crop: 'ragi',
    variety: 'Ragi Certified Seed',
    region: 'Telangana',
    durationDays: 110,
    seedRequirement: '3–4 kg/acre',
    expectedYield: '7–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Ragi is included in Telangana seed production information.'
  },

  {
    crop: 'soybean',
    variety: 'JS 335',
    region: 'Telangana',
    durationDays: 100,
    seedRequirement: '25–30 kg/acre',
    expectedYield: '7–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'JS 335 is listed in Telangana seed production information.'
  },

  {
    crop: 'sesame',
    variety: 'Swetha',
    region: 'Telangana',
    durationDays: 85,
    seedRequirement: '1.5–2 kg/acre',
    expectedYield: '3–5 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Swetha sesame is listed in Telangana seed production information.'
  },

  {
    crop: 'sunflower',
    variety: 'Sunflower Certified Seed',
    region: 'Telangana',
    durationDays: 90,
    seedRequirement: '2–3 kg/acre',
    expectedYield: '6–10 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Sunflower is included in Telangana seed programs.'
  },

  {
    crop: 'chilli',
    variety: 'Teja Chilli',
    region: 'Telangana',
    durationDays: 180,
    seedRequirement: '200–250 g/acre',
    expectedYield: '8–12 quintals dry chilli/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Chilli is an important commercial crop in Telangana; verify suitable variety with local supplier.'
  },

  {
    crop: 'turmeric',
    variety: 'Turmeric Certified Seed Rhizome',
    region: 'Telangana',
    durationDays: 210,
    seedRequirement: '800–1000 kg/acre',
    expectedYield: '20–30 quintals dry turmeric/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Turmeric is a major commercial crop; planting material price varies significantly by variety and supplier.'
  },

  {
    crop: 'onion',
    variety: 'Onion Certified Seed',
    region: 'Telangana',
    durationDays: 120,
    seedRequirement: '3–4 kg/acre',
    expectedYield: '80–120 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Suitable onion seed should be selected according to season, soil and irrigation availability.'
  },

  {
    crop: 'tomato',
    variety: 'Hybrid Tomato',
    region: 'Telangana',
    durationDays: 110,
    seedRequirement: '60–100 g/acre',
    expectedYield: '100–180 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'AgriSaathi Local Seed Catalog',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Hybrid tomato seed should be selected according to local season and disease resistance requirements.'
  },

  {
    crop: 'castor',
    variety: 'Castor Certified Seed',
    region: 'Telangana',
    durationDays: 150,
    seedRequirement: '2–3 kg/acre',
    expectedYield: '5–8 quintals/acre',
    price: null,
    priceUnit: null,
    priceType: 'not verified',
    source: 'TSSDCL',
    lastUpdated: '2026-09-20',
    whyRecommended:
      'Castor is included in Telangana agricultural seed planning information.'
  }
];

  success(res, { varieties });
  return;
}
  if (method === 'POST' && pathname === '/api/seed/recommendations') {
    const profile = requireProfile();
    const input = await readJson(req);
    const values = {
      crop: textValue(input.crop ?? input.currentCrop ?? profile.currentCrop, 'crop', { required: true, max: 100 }),
      location: textValue(input.location ?? profile.location, 'location', { max: 200 }),
      soil: textValue(input.soil ?? input.soilType ?? profile.soilType, 'soil', { max: 100 }),
      season: textValue(input.season ?? profile.season, 'season', { max: 50 }),
      farmArea: numberValue(input.farmArea ?? profile.farmArea, 'farmArea', { min: 0.001, max: 100000 }),
      waterAvailability: textValue(input.waterAvailability ?? profile.waterSource, 'waterAvailability', { max: 100 })
    };
    const result = await getSeedRecommendations(values);
    db.insert('seed_recommendations', { id: randomUUID(), user_id: db.LOCAL_USER_ID, input_json: JSON.stringify(values), result_json: JSON.stringify(result), source: result.source || null, created_at: db.now() });
    db.saveHistory('seed_recommendation', 'Seed advisor checked', { crop: values.crop, available: result.available });
    success(res, { input: values, ...result });
    return;
  }
  if (method === 'POST' && pathname === '/api/irrigation/advice') {
    const profile = requireProfile();
    const input = await readJson(req);
    const weather = await weatherService.getWeather(profile);
    const result = irrigationAdvice(input, weather);
    db.saveHistory('irrigation_advice', 'Irrigation advice generated', { input, result });
    success(res, result);
    return;
  }
  if (method === 'POST' && pathname === '/api/fertilizer/advice') {
    const profile = requireProfile();
    const input = await readJson(req);
    const values = fertilizerInputs(input, profile);
    const result = fertilizerAdvice(values);
    db.saveHistory('fertilizer_advice', 'Fertilizer advisory generated', { input: values, result });
    success(res, result);
    return;
  }
  if (method === 'POST' && pathname === '/api/pest-management') {
    const profile = requireProfile();
    const input = await readJson(req);
    const values = pestManagementInputs(input, profile);
    const result = generalPestManagement(values);
    db.insert('pest_management', { id: randomUUID(), user_id: db.LOCAL_USER_ID, input_json: JSON.stringify(values), result_json: JSON.stringify(result), created_at: db.now() });
    db.saveHistory('pest_management', 'Pest management guidance generated', { input: values, result });
    success(res, result);
    return;
  }
  if (method === 'POST' && pathname === '/api/pesticide/calculate') {
    const input = await readJson(req);
    const result = pesticideCalculation(input);
    db.insert('farm_calculations', { id: randomUUID(), user_id: db.LOCAL_USER_ID, calculation_type: 'pesticide', input_json: JSON.stringify(input), result_json: JSON.stringify(result), created_at: db.now() });
    db.saveHistory('pesticide_calculation', 'Pesticide label calculation generated', { input, result });
    success(res, result, 201);
    return;
  }
  if (method === 'POST' && pathname === '/api/calculations/farm') {
    const input = await readJson(req);
    const result = farmCalculation(input);
    db.insert('farm_calculations', { id: randomUUID(), user_id: db.LOCAL_USER_ID, calculation_type: 'farm', input_json: JSON.stringify(input), result_json: JSON.stringify(result), created_at: db.now() });
    db.saveHistory('farm_calculation', 'Farm calculation generated', { input, result });
    success(res, result, 201);
    return;
  }
 if (method === 'POST' && pathname === '/api/yield/predictions') {
  const input = await readJson(req);

  try {
    const result = await predictYield(input);

    db.insert('yield_predictions', {
      id: randomUUID(),
      user_id: db.LOCAL_USER_ID,
      input_json: JSON.stringify(input),
      result_json: JSON.stringify(result),
      model_version: result.modelVersion || 'yield-rf-2024',
      created_at: db.now()
    });

    db.saveHistory(
      'yield_prediction',
      'Yield prediction generated',
      {
        input,
        result
      }
    );

    success(res, result, 201);
  } catch (error) {
    throw new AppError(
      503,
      'YIELD_MODEL_ERROR',
      `Yield prediction could not be generated: ${error.message}`
    );
  }

  return;
}
  if (method === 'POST' && pathname === '/api/translate') {
  const input = await readJson(req);

  const text = String(input.text || '').trim();
  const targetLanguage = String(input.targetLanguage || 'te').trim();

  if (!text) {
    throw new AppError(400, 'TRANSLATION_TEXT_REQUIRED', 'Text is required.');
  }

  if (!['en', 'te', 'hi'].includes(targetLanguage)) {
    throw new AppError(400, 'INVALID_LANGUAGE', 'Unsupported translation language.');
  }

  const languagePair = `en|${targetLanguage}`;

  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}` +
    `&langpair=${encodeURIComponent(languagePair)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new AppError(503, 'TRANSLATION_UNAVAILABLE', 'Translation service unavailable.');
  }

  const data = await response.json();

  const translatedText =
    data?.responseData?.translatedText;

  if (!translatedText) {
    throw new AppError(503, 'TRANSLATION_FAILED', 'Translation failed.');
  }

  success(res, {
    ok: true,
    originalText: text,
    translatedText,
    targetLanguage
  });


  return;
}
if (method === 'POST' && pathname === '/api/disease/analyze') {
  const input = await readJson(req);
  const file = fileFromDataUrl(input);

  try {
    const result = await diseasePredict({
      imagePath: file.tempPath,
      crop: textValue(input.crop, 'crop', { max: 100 })
    });

    db.insert('disease_analyses', {
      id: randomUUID(),
      user_id: db.LOCAL_USER_ID,
      file_name: file.fileName,
      mime_type: file.mimeType,
      result_json: JSON.stringify(result),
      model_version: result.modelVersion || null,
      created_at: db.now()
    });

    db.saveHistory(
      'disease_analysis',
      'Disease image analyzed',
      {
        fileName: file.fileName,
        result
      }
    );

    success(res, result, 201);
  } finally {
    fs.rmSync(file.tempPath, { force: true });
  }

  return;
}
  if (method === 'POST' && pathname === '/api/copilot/messages') {
    const input = await readJson(req);
    const question = textValue(input.message, 'message', { required: true, max: 2000 });
    const profile = db.getProfile();
    let weather = null;
    if (profile) {
      try { weather = await weatherService.getWeather(profile); } catch { weather = null; }
    }
    const result = await askCopilot({ question, language: input.language || profile?.preferredLanguage || 'en', profile, weather, history: db.listHistory(10) });
    db.saveHistory('copilot', 'Farm Copilot response', { question, provider: result.provider, generatedAt: result.generatedAt });
    success(res, result, 201);
    return;
  }
  throw new AppError(404, 'NOT_FOUND', 'API endpoint not found.');
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(requested).replace(/^([/\\])+/, '');
  const filePath = path.resolve(config.frontendDir, normalized);
  if (!filePath.startsWith(`${config.frontendDir}${path.sep}`) && filePath !== config.frontendDir) {
    throw new AppError(403, 'FORBIDDEN', 'File path is not allowed.');
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new AppError(404, 'NOT_FOUND', 'Page not found.');
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin'
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) await api(req, res, req.method, url.pathname);
    else serveStatic(req, res, url.pathname);
  } catch (error) {
    failure(res, error);
  }
});

if (require.main === module) {
  server.listen(config.port, config.host, () => {
    process.stdout.write(`AgriSaathi listening on http://${config.host}:${config.port}\n`);
  });
}

module.exports = { server, validateProfile, cropInputs };
