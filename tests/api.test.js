const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisaathi-test-'));
process.env.DATABASE_PATH = path.join(testDir, 'agrisaathi-test.db');
process.env.PORT = '0';

const { server, cropInputs } = require('../backend/server');
const db = require('../backend/db');

let baseUrl;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  return { status: response.status, body: await response.json() };
}

test('health reports real local component states', async () => {
  const result = await request('/api/health');
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.data.backend.status, 'healthy');
  assert.equal(result.body.data.database.status, 'healthy');
  assert.ok(['healthy', 'unavailable'].includes(result.body.data.weather.status));

  const ml = await request('/api/ml/health');
  assert.equal(ml.status, 200);
  assert.ok(['available', 'unavailable', 'partially_available'].includes(ml.body.data.status));
  assert.equal(typeof ml.body.data.crop.artifactPresent, 'boolean');
});

test('same-origin frontend assets are served', async () => {
  const [page, app, styles] = await Promise.all([
    fetch(`${baseUrl}/`), fetch(`${baseUrl}/app.js`), fetch(`${baseUrl}/styles.css`)
  ]);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await app.text(), /const api =/);
  assert.match(await styles.text(), /\.nav-item/);
});

test('farm profile validates, persists, and reads back', async () => {
  const invalid = await request('/api/profile', { method: 'PUT', body: JSON.stringify({}) });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');

  const profile = {
    farmerName: 'Test Farmer', location: 'Warangal, Telangana', latitude: 17.9689, longitude: 79.5941,
    farmArea: 5, areaUnit: 'acre', soilType: 'Black soil', soilPh: 6.8, nitrogen: 90,
    phosphorus: 42, potassium: 43, currentCrop: 'Rice', season: 'Kharif', waterSource: 'Borewell',
    irrigationMethod: 'Flood', preferredLanguage: 'en'
  };
  const saved = await request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.profile.location, profile.location);
  assert.equal(saved.body.data.profile.farmArea, 5);

  const loaded = await request('/api/profile');
  assert.equal(loaded.status, 200);
  assert.equal(loaded.body.data.profile.farmerName, 'Test Farmer');
  assert.equal(loaded.body.data.profile.currentCrop, 'Rice');
});

test('profile language can be updated without overwriting the farm profile', async () => {
  const result = await request('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({ preferredLanguage: 'te' })
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.profile.preferredLanguage, 'te');
  assert.equal(result.body.data.profile.farmerName, 'Test Farmer');
  assert.equal(result.body.data.profile.location, 'Warangal, Telangana');

  const invalid = await request('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({ preferredLanguage: 'en', location: 'Unexpected overwrite' })
  });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
});

test('crop request normalization uses the model schema and records supplied context separately', () => {
  const values = cropInputs({
    nitrogen: 90, phosphorus: 42, potassium: 43, temperature: 25,
    humidity: 80, ph: 6.5, rainfall: 200, location: 'Karimnagar, Telangana',
    soilType: 'Black soil', season: 'Kharif', waterAvailability: 'Borewell', farmArea: 3
  }, {
    location: 'Warangal, Telangana', soilType: 'Red soil', season: 'Rabi', waterSource: 'Canal', farmArea: 5,
    nitrogen: 1, phosphorus: 1, potassium: 1, soilPh: 1
  }, null);
  assert.deepEqual({ N: values.N, P: values.P, K: values.K }, { N: 90, P: 42, K: 43 });
  assert.equal(values.temperature, 25);
  assert.equal(values.location, 'Karimnagar, Telangana');
  assert.equal(values.farmSize, 3);
});

test('trained crop artifact serves model-derived recommendations when available', {
  skip: !fs.existsSync(path.join(__dirname, '..', 'ml', 'models', 'crop_model.joblib'))
}, async () => {
  const result = await request('/api/crop/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      nitrogen: 90, phosphorus: 42, potassium: 43, temperature: 25,
      humidity: 80, ph: 6.5, rainfall: 200, location: 'Warangal, Telangana',
      soilType: 'Black soil', season: 'Kharif', waterAvailability: 'Borewell', farmArea: 5
    })
  });
  assert.equal(result.status, 201);
  const recommendations = result.body.data.result.recommendations;
  assert.equal(recommendations.length, 3);
  assert.ok(recommendations.every((item) => typeof item.crop === 'string' && Number.isFinite(item.probability)));
  assert.match(recommendations[0].explanation, /not features in the current crop model/);
});

test('farm calculation uses submitted inputs and persists history', async () => {
  const input = {
    area: 5, expectedYieldPerAcre: 20, sellingPrice: 2500,
    seedCost: 10000, fertilizerCost: 14000, pesticideCost: 6000, labourCost: 30000, irrigationCost: 5000, otherCost: 3000,
    currency: 'INR', yieldUnit: 'quintal'
  };
  const result = await request('/api/calculations/farm', { method: 'POST', body: JSON.stringify(input) });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.production, 100);
  assert.equal(result.body.data.revenue, 250000);
  assert.equal(result.body.data.totalCost, 68000);
  assert.equal(result.body.data.profit, 182000);

  const history = await request('/api/history');
  assert.equal(history.status, 200);
  assert.ok(history.body.data.records.some((record) => record.type === 'farm_calculation'));
});

test('farm calculation accepts blank optional cost categories as zero', async () => {
  const result = await request('/api/calculations/farm', {
    method: 'POST',
    body: JSON.stringify({ area: 2, expectedYieldPerAcre: 10, sellingPrice: 1000 })
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.totalCost, 0);
  assert.equal(result.body.data.revenue, 20000);
  assert.equal(result.body.data.profit, 20000);
});

test('pesticide calculation requires and only uses verified entered dosage', async () => {
  const result = await request('/api/pesticide/calculate', {
    method: 'POST',
    body: JSON.stringify({ farmArea: 5, verifiedDosage: 10, waterPerAcre: 150, tankCapacity: 15, dosageUnit: 'g/acre' })
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.totalProduct, 50);
  assert.equal(result.body.data.totalWater, 750);
  assert.equal(result.body.data.tanks, 50);
  assert.match(result.body.data.warning, /Verify against the product label/);
});

test('fertilizer and pest advisors validate context and return conservative guidance', async () => {
  const fertilizer = await request('/api/fertilizer/advice', {
    method: 'POST',
    body: JSON.stringify({ growthStage: 'Vegetative' })
  });
  assert.equal(fertilizer.status, 200);
  assert.equal(fertilizer.body.data.crop, 'Rice');
  assert.equal(fertilizer.body.data.growthStage, 'Vegetative');
  assert.deepEqual(
    fertilizer.body.data.findings.map(({ nutrient, recordedValue }) => ({ nutrient, recordedValue })),
    [{ nutrient: 'Nitrogen', recordedValue: 90 }, { nutrient: 'Phosphorus', recordedValue: 42 }, { nutrient: 'Potassium', recordedValue: 43 }]
  );
  assert.match(fertilizer.body.data.disclaimer, /No fertilizer dosage/);

  const invalidFertilizer = await request('/api/fertilizer/advice', {
    method: 'POST',
    body: JSON.stringify({ nitrogen: 'not-a-number' })
  });
  assert.equal(invalidFertilizer.status, 422);
  assert.equal(invalidFertilizer.body.error.code, 'VALIDATION_ERROR');

  const pest = await request('/api/pest-management', {
    method: 'POST',
    body: JSON.stringify({ crop: 'Rice', problem: 'Brown spots on lower leaves' })
  });
  assert.equal(pest.status, 200);
  assert.equal(pest.body.data.crop, 'Rice');
  assert.equal(pest.body.data.problem, 'Brown spots on lower leaves');
  assert.equal(pest.body.data.recommendations.length, 4);
  assert.match(pest.body.data.scope, /not a diagnosis/i);
  assert.match(pest.body.data.pesticideNotice, /Dosage unavailable/);

  const invalidPest = await request('/api/pest-management', {
    method: 'POST',
    body: JSON.stringify({ crop: 'Rice' })
  });
  assert.equal(invalidPest.status, 422);
  assert.equal(invalidPest.body.error.code, 'VALIDATION_ERROR');

  const history = await request('/api/history');
  assert.ok(history.body.data.records.some((record) => record.type === 'fertilizer_advice'));
  assert.ok(history.body.data.records.some((record) => record.type === 'pest_management'));
});

test('JSON image upload validates the image before reporting an unavailable model', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const result = await request('/api/disease/analyze', {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'leaf.png', mimeType: 'image/png', imageBase64: `data:image/png;base64,${png}`, crop: 'Rice'
    })
  });
  assert.equal(result.status, 503);
  assert.equal(result.body.error.code, 'DISEASE_MODEL_UNAVAILABLE');

  const spoofed = await request('/api/disease/analyze', {
    method: 'POST',
    body: JSON.stringify({ fileName: 'leaf.png', mimeType: 'image/png', imageBase64: 'data:image/png;base64,aGVsbG8=' })
  });
  assert.equal(spoofed.status, 422);
  assert.equal(spoofed.body.error.code, 'INVALID_IMAGE');
});

test('untrained yield model is explicit rather than a fabricated estimate', async () => {
  const result = await request('/api/yield/predictions', { method: 'POST', body: JSON.stringify({ crop: 'Rice', area: 5 }) });
  assert.equal(result.status, 503);
  assert.equal(result.body.error.code, 'YIELD_MODEL_UNAVAILABLE');
});
