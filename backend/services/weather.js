const { AppError } = require('../errors');
const config = require('../config');

const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
  55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 66: 'Light freezing rain',
  67: 'Heavy freezing rain', 71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers',
  82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
};

const cache = new Map();
const CACHE_MS = 5 * 60 * 1000;

function numeric(value) {
  return Number.isFinite(value) ? value : null;
}

function weatherCondition(code) {
  return WMO_CODES[code] || 'Unknown condition';
}

function makeUrl(latitude, longitude) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,uv_index',
    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max',
    forecast_days: '7',
    timezone: 'auto'
  });
  const base = `${config.weatherBaseUrl.replace(/\/+$/, '')}/`;
  const url = new URL('forecast', base);
  url.search = query.toString();
  return url.toString();
}

function expandHourly(hourly) {
  if (!hourly?.time) return [];
  return hourly.time.map((time, index) => ({
    time,
    temperature: numeric(hourly.temperature_2m?.[index]),
    humidity: numeric(hourly.relative_humidity_2m?.[index]),
    rainProbability: numeric(hourly.precipitation_probability?.[index]),
    precipitation: numeric(hourly.precipitation?.[index]),
    windSpeed: numeric(hourly.wind_speed_10m?.[index]),
    windDirection: numeric(hourly.wind_direction_10m?.[index]),
    weatherCode: numeric(hourly.weather_code?.[index]),
    condition: weatherCondition(hourly.weather_code?.[index])
  }));
}

function expandDaily(daily) {
  if (!daily?.time) return [];
  return daily.time.map((date, index) => ({
    date,
    weatherCode: numeric(daily.weather_code?.[index]),
    condition: weatherCondition(daily.weather_code?.[index]),
    temperatureMax: numeric(daily.temperature_2m_max?.[index]),
    temperatureMin: numeric(daily.temperature_2m_min?.[index]),
    rainProbability: numeric(daily.precipitation_probability_max?.[index]),
    rainfall: numeric(daily.precipitation_sum?.[index]),
    windSpeedMax: numeric(daily.wind_speed_10m_max?.[index]),
    uvIndexMax: numeric(daily.uv_index_max?.[index])
  }));
}

async function requestWeather(latitude, longitude) {
  if (config.weatherProvider !== 'open-meteo') {
    throw new Error(`Unsupported weather provider: ${config.weatherProvider}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    config.weatherTimeoutMs
  );

  try {
    const response = await fetch(makeUrl(latitude, longitude), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo returned HTTP ${response.status}`);
    }

    const raw = await response.json();

    if (!raw.current || !raw.daily || !raw.hourly) {
      throw new Error('Open-Meteo response was incomplete');
    }

    const current = {
      observedAt: raw.current.time,
      temperature: numeric(raw.current.temperature_2m),
      feelsLike: numeric(raw.current.apparent_temperature),
      humidity: numeric(raw.current.relative_humidity_2m),
      precipitation: numeric(raw.current.precipitation),
      rainfall: numeric(raw.current.rain),
      windSpeed: numeric(raw.current.wind_speed_10m),
      windDirection: numeric(raw.current.wind_direction_10m),
      uvIndex: numeric(raw.current.uv_index),
      weatherCode: numeric(raw.current.weather_code),
      condition: weatherCondition(raw.current.weather_code)
    };

    const hourly = expandHourly(raw.hourly);
    const daily = expandDaily(raw.daily);

    return {
      source: 'Open-Meteo',
      sourceUrl: config.weatherBaseUrl,
      lastUpdated: new Date().toISOString(),

      location: {
        latitude: raw.latitude,
        longitude: raw.longitude,
        elevation: raw.elevation
      },

      timezone: raw.timezone,

      current,
      hourly,
      daily,

      nextRain: findNextRainEvent(hourly)
    };
  } finally {
    clearTimeout(timer);
  }
}

function findNextRainEvent(hourly) {
  if (!Array.isArray(hourly) || !hourly.length) {
    return null;
  }

  const now = Date.now();

  const RAIN_PROBABILITY_THRESHOLD = 70;
  const RAIN_MM_THRESHOLD = 1;

  for (const entry of hourly) {
    const rainTime = new Date(entry.time).getTime();

    if (!Number.isFinite(rainTime) || rainTime <= now) {
      continue;
    }

    const probability = Number(entry.rainProbability) || 0;
    const precipitation = Number(entry.precipitation) || 0;

    if (
      probability >= RAIN_PROBABILITY_THRESHOLD &&
      precipitation >= RAIN_MM_THRESHOLD
    ) {
      const minutesUntilRain =
        Math.round((rainTime - now) / 60000);

      return {
        expectedTime: entry.time,
        minutesUntilRain,
        rainProbability: probability,
        precipitation,
        condition: entry.condition
      };
    }
  }

  return null;
}
async function getWeather(profile, { force = false } = {}) {
  if (!profile || !Number.isFinite(profile.latitude) || !Number.isFinite(profile.longitude)) {
    throw new AppError(422, 'FARM_LOCATION_REQUIRED', 'Save a farm profile with valid latitude and longitude before requesting weather.');
  }
  const key = `${profile.latitude.toFixed(3)},${profile.longitude.toFixed(3)}`;
  const prior = cache.get(key);
  if (!force && prior && Date.now() - prior.fetchedAt < CACHE_MS) return prior.value;
  try {
    const value = await requestWeather(profile.latitude, profile.longitude);
    cache.set(key, { fetchedAt: Date.now(), value });
    return value;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, 'WEATHER_UNAVAILABLE', 'Weather data temporarily unavailable.', { reason: error.message });
  }
}

async function probe() {
  try {
    await requestWeather(17.385, 78.4867);
    return { status: 'healthy', provider: 'Open-Meteo', baseUrl: config.weatherBaseUrl };
  } catch (error) {
    return { status: 'unavailable', provider: config.weatherProvider, detail: error.message };
  }
}

module.exports = {
  getWeather,
  probe,
  weatherCondition,
  findNextRainEvent
};
