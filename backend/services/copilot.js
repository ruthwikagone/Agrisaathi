const { AppError } = require('../errors');
const weatherService = require('./weather');
const { irrigationAdvice, fertilizerAdvice, generalPestManagement } = require('./agronomy');
const { farmCalculation, pesticideCalculation } = require('./calculators');
const { getSeedRecommendations } = require('./seed');
const { cropPredict, modelHealth } = require('./models');
const { predictYield } = require('./yieldModel');

const TELUGU_RE = /[\u0c00-\u0c7f]/u;

const CROP_ALIASES = [
  ['rice', ['rice', 'paddy', 'వరి', 'బియ్యం']],
  ['chilli', ['chilli', 'chili', 'మిరప', 'మిరపకాయ']],
  ['maize', ['maize', 'corn', 'మొక్కజొన్న']],
  ['groundnut', ['groundnut', 'peanut', 'వేరుశెనగ']],
  ['cotton', ['cotton', 'పత్తి']],
  ['tomato', ['tomato', 'టమాటా']],
  ['castor', ['castor', 'ఆముదం']]
];

const TELUGU_CROP_NAMES = {
  rice: 'వరి', chilli: 'మిరప', maize: 'మొక్కజొన్న', groundnut: 'వేరుశెనగ',
  cotton: 'పత్తి', tomato: 'టమాటా', castor: 'ఆముదం'
};

function detectLanguage(question, requestedLanguage) {
  if (TELUGU_RE.test(String(question || ''))) return 'te';
  return requestedLanguage === 'te' ? 'te' : 'en';
}

function localized(language, english, telugu) {
  return language === 'te' ? telugu : english;
}

function makeResponse(intent, language, text, { sources = [], action = null, data = null } = {}) {
  return {
    provider: 'local-intent-router',
    intent,
    language,
    generatedAt: new Date().toISOString(),
    text,
    sources,
    ...(action ? { action } : {}),
    ...(data ? { data } : {})
  };
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase();
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(question, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(question);
    if (match) return numberOrNull(match[1]);
  }
  return null;
}

function numberAfter(question, labels) {
  const source = labels.map(escapeRegExp).join('|');
  const expression = new RegExp(
    `(?:${source})\\s*(?:is|=|:|of|for|కు|కి|ను)?\\s*(?:₹|rs\\.?|inr)?\\s*(\\d+(?:\\.\\d+)?)`,
    'iu'
  );
  const match = expression.exec(question);
  return match ? numberOrNull(match[1]) : null;
}

function cropFromText(question, profile) {
  const text = normalize(question);
  for (const [crop, aliases] of CROP_ALIASES) {
    if (aliases.some((alias) => text.includes(alias))) return crop;
  }
  const profileCrop = normalize(profile?.currentCrop);
  for (const [crop, aliases] of CROP_ALIASES) {
    if (aliases.some((alias) => profileCrop.includes(alias))) return crop;
  }
  return profileCrop || null;
}

function displayCrop(crop, language) {
  if (!crop) return localized(language, 'your crop', 'మీ పంట');
  return language === 'te' ? (TELUGU_CROP_NAMES[crop] || crop) : crop;
}

function stageFromText(question) {
  const text = normalize(question);
  if (hasAny(text, ['flowering', 'bloom', 'పుష్ప', 'పూల'])) return 'flowering';
  if (hasAny(text, ['vegetative', 'growth stage', 'వృక్ష', 'వెజిటేటివ్'])) return 'vegetative';
  if (hasAny(text, ['seedling', 'నారు'])) return 'seedling';
  if (hasAny(text, ['harvest', 'maturity', 'పంటకోత', 'పక్వ'])) return 'maturity';
  return null;
}

function areaFromText(question, profile) {
  const parsed = firstNumber(question, [
    /(\d+(?:\.\d+)?)\s*(?:acres?|ఎకర(?:ం|ాలు)?)/iu,
    /(?:farm area|area|పొలం విస్తీర్ణం)\s*(?:is|=|:|ను|కు)?\s*(\d+(?:\.\d+)?)/iu
  ]);
  return parsed ?? numberOrNull(profile?.farmArea);
}

function numberListText(numbers) {
  return numbers.map((number) => String(number)).join(', ');
}

function detectIntent(question) {
  const text = normalize(question);
  const pesticideTerms = ['pesticide dosage', 'label dosage', 'spray mix', 'tank', 'dosage', 'dose', 'పురుగుమందు మోతాదు', 'డోసు', 'స్ప్రే మిశ్రమం', 'ట్యాంక్', 'ఎంత మందు'];
  const calculatorTerms = ['calculate', 'calculation', 'profit', 'revenue', 'income', 'cost', 'expense', 'లెక్క', 'లాభం', 'ఆదాయం', 'ఖర్చు', 'వ్యయం'];
  const cropTerms = ['which crop', 'what crop', 'suitable crop', 'crop recommend', 'ఏ పంట', 'ఏ పంట వేయాలి', 'పంట సిఫార్సు', 'సరైన పంట'];
  const seedTerms = ['seed', 'variety', 'cultivar', 'విత్తనం', 'విత్తనాలు', 'రకం'];
  const fertilizerTerms = ['fertilizer', 'manure', 'urea', 'dap', 'npk', 'nutrient', 'ఎరువు', 'ఎరువులు', 'యూరియా', 'డిఏపీ', 'ఎన్పీకే', 'పోషకాలు'];
  const irrigationTerms = ['irrigat', 'soil moisture', 'water field', 'water crop', 'నీటిపారుదల', 'పారుదల', 'నీరు పెట్ట', 'నీళ్ళు పెట్ట', 'సాగునీరు', 'నేల తేమ'];
  const weatherTerms = ['weather', 'forecast', 'rainfall', 'rain', 'temperature', 'humidity', 'wind', 'వాతావరణం', 'వర్షం', 'వాన', 'అంచనా', 'ఉష్ణోగ్రత', 'తేమ', 'గాలి'];
  const yieldTerms = ['yield', 'harvest estimate', 'production estimate', 'దిగుబడి', 'ఎంత పంట', 'ఉత్పత్తి అంచనా'];
  const diseaseTerms = ['disease', 'leaf spot', 'wilt', 'blight', 'lesion', 'mosaic', 'photo', 'image', 'తెగులు', 'వ్యాధి', 'మచ్చలు', 'ఆకు మచ్చ', 'వాడిపోవడం', 'ఫోటో', 'చిత్రం'];
  const pestTerms = ['pest', 'insect', 'whitefly', 'aphid', 'thrips', 'borer', 'larvae', 'పురుగు', 'కీటకం', 'చీడపీడ', 'తెల్లదోమ', 'అఫిడ్స్', 'త్రిప్స్', 'బోరర్', 'గొంగళిపురుగు'];

  if (hasAny(text, pesticideTerms)) return 'pesticide_calculator';
  if (hasAny(text, calculatorTerms)) return 'farm_calculator';
  if (hasAny(text, cropTerms)) return 'crop_recommendation';
  if (hasAny(text, seedTerms)) return 'seed';
  if (hasAny(text, fertilizerTerms)) return 'fertilizer';
  if (hasAny(text, irrigationTerms)) return 'irrigation';
  if (hasAny(text, yieldTerms)) return 'yield';
  if (hasAny(text, diseaseTerms)) return 'crop_health';
  if (hasAny(text, pestTerms)) return 'pest_management';
  if (hasAny(text, weatherTerms)) return 'weather';
  return 'general';
}

async function getWeather(profile, weather) {
  if (weather?.current || weather?.daily?.length) return weather;
  if (!profile) return null;
  try {
    return await weatherService.getWeather(profile);
  } catch {
    return null;
  }
}

function weatherReply(weather, language) {
  if (!weather?.current) {
    return localized(
      language,
      'Live weather is not available yet. Save a farm profile with coordinates and try again.',
      'ప్రత్యక్ష వాతావరణ సమాచారం ఇంకా అందుబాటులో లేదు. కోఆర్డినేట్లతో పొలం ప్రొఫైల్‌ను సేవ్ చేసి మళ్లీ ప్రయత్నించండి.'
    );
  }
  const current = weather.current;
  const today = weather.daily?.[0] || {};
  const temperature = numberOrNull(current.temperature);
  const humidity = numberOrNull(current.humidity);
  const rainProbability = numberOrNull(today.rainProbability);
  const rainfall = numberOrNull(today.rainfall);
  if (language === 'te') {
    return `మీ పొలం వద్ద ప్రస్తుతం ఉష్ణోగ్రత ${temperature ?? 'అందుబాటులో లేదు'}°C, తేమ ${humidity ?? 'అందుబాటులో లేదు'}%. ఈరోజు వర్షం వచ్చే అవకాశం ${rainProbability ?? 'అందుబాటులో లేదు'}%; అంచనా వర్షపాతం ${rainfall ?? 'అందుబాటులో లేదు'} mm. పొలం పనికి ముందు ప్రత్యక్ష వాతావరణ పేజీని కూడా చూడండి.`;
  }
  return `Current farm weather: ${current.condition || 'condition unavailable'}. Temperature ${temperature ?? 'not available'}°C, humidity ${humidity ?? 'not available'}%. Today's rain probability is ${rainProbability ?? 'not available'}% with ${rainfall ?? 'not available'} mm forecast rainfall.`;
}

function irrigationReply(advice, language) {
  const basis = advice.weatherBasis || {};
  if (language === 'te') {
    const decisions = {
      'Irrigation can be delayed': 'నీటిపారుదలను వాయిదా వేయవచ్చు',
      'Irrigation assessment needed now': 'ఇప్పుడు నీటిపారుదల అవసరాన్ని పరిశీలించండి',
      'Monitor closely before irrigating': 'నీరు పెట్టే ముందు నేల తేమను జాగ్రత్తగా పరిశీలించండి',
      'Monitor soil moisture': 'నేల తేమను పరిశీలించండి'
    };
    return `${decisions[advice.decision] || advice.decision}. వర్షం వచ్చే అవకాశం ${basis.rainProbability ?? 'అందుబాటులో లేదు'}%, అంచనా వర్షపాతం ${basis.rainfall ?? 'అందుబాటులో లేదు'} mm. ఈ సేవ ఖచ్చితమైన నీటి పరిమాణాన్ని లెక్కించదు; వేర్ల ప్రాంతంలోని నేల తేమను తనిఖీ చేయండి.`;
  }
  return `${advice.decision}. Rain probability: ${basis.rainProbability ?? 'not available'}%; expected rainfall: ${basis.rainfall ?? 'not available'} mm. This advisor does not calculate an exact water volume; verify root-zone soil moisture before scheduling irrigation.`;
}

function fertilizerReply(result, language) {
  const recommendation = result.recommendation || {};
  const nutrients = (result.soilTest || [])
    .filter((item) => numberOrNull(item.value) !== null)
    .map((item) => `${item.nutrient} ${item.value}`);
  const crop = displayCrop(normalize(result.crop), language);
  if (language === 'te') {
    return `మీ ${crop} పంటకు ఎరువు సలహా సిద్ధంగా ఉంది.${result.growthStage ? ` దశ: ${result.growthStage}.` : ''} నమోదు చేసిన పోషక విలువలు: ${nutrients.length ? numberListText(nutrients) : 'అందుబాటులో లేవు'}. ${recommendation.rate ? `సేవలోని రిఫరెన్స్: ${recommendation.rate}.` : ''} నేల పరీక్ష మరియు స్థానిక వ్యవసాయ మార్గదర్శకంతో తుది మోతాదును నిర్ధారించండి.`;
  }
  return `${recommendation.recommendation || 'Fertilizer advice is available for this crop.'}${recommendation.rate ? ` Reference: ${recommendation.rate}.` : ''}${nutrients.length ? ` Recorded soil values: ${numberListText(nutrients)}.` : ''} Verify the final programme against a soil test and local guidance.`;
}

function pestReply(result, language) {
  const first = result.recommendations?.[0] || {};
  if (language === 'te') {
    return `మీ ${displayCrop(normalize(result.crop), language)} పంటలో "${result.problem}" కోసం సమగ్ర పురుగు నిర్వహణ సూచన: పొలాన్ని పరిశీలించి సమస్యను నిర్ధారించండి, ప్రభావిత ప్రాంతాన్ని నమోదు చేయండి మరియు ప్రయోజనకర కీటకాలను కాపాడండి. పురుగుమందు మోతాదు ఈ సేవ ఇవ్వదు; ఉత్పత్తి లేబుల్‌ను తప్పనిసరిగా ధృవీకరించండి.`;
  }
  return `${first.what || 'Inspect the reported problem before treatment.'} ${first.how || ''} ${result.pesticideNotice || 'Do not use an unverified pesticide dosage.'}`.trim();
}

function cropInput(question, profile, weather) {
  const nitrogen = numberAfter(question, ['nitrogen', 'n']) ?? numberOrNull(profile?.nitrogen);
  const phosphorus = numberAfter(question, ['phosphorus', 'p']) ?? numberOrNull(profile?.phosphorus);
  const potassium = numberAfter(question, ['potassium', 'k']) ?? numberOrNull(profile?.potassium);
  const ph = numberAfter(question, ['soil ph', 'ph', 'పీహెచ్']) ?? numberOrNull(profile?.soilPh);
  const temperature = numberAfter(question, ['temperature', 'temp', 'ఉష్ణోగ్రత']) ?? numberOrNull(weather?.current?.temperature);
  const humidity = numberAfter(question, ['humidity', 'తేమ']) ?? numberOrNull(weather?.current?.humidity);
  const rainfall = numberAfter(question, ['rainfall', 'వర్షపాతం']) ?? numberOrNull(weather?.daily?.[0]?.rainfall);
  const values = { N: nitrogen, P: phosphorus, K: potassium, temperature, humidity, ph, rainfall, top_k: 3 };
  const names = { N: 'N', P: 'P', K: 'K', temperature: 'temperature', humidity: 'humidity', ph: 'soil pH', rainfall: 'rainfall' };
  return { values, missing: Object.entries(values).filter(([key, value]) => key !== 'top_k' && value === null).map(([key]) => names[key]) };
}

function cropReply(result, language) {
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
  const ranked = recommendations.map((item) => `${item.crop} (${(Number(item.probability) * 100).toFixed(1)}%)`).join(', ');
  if (language === 'te') {
    return `స్థానిక పంట సిఫార్సు మోడల్ ఫలితం: ${ranked || 'ఫలితం అందుబాటులో లేదు'}. ఇవి మోడల్ సంభావ్యతలు మాత్రమే; స్థానిక నేల, సీజన్ మరియు మార్కెట్ పరిస్థితులను కూడా పరిశీలించండి.`;
  }
  return `Local crop-model result: ${ranked || 'no recommendation returned'}. These are model probabilities, not calibrated confidence or a field guarantee.`;
}

function seedReply(result, crop, language) {
  const varieties = (result.varieties || []).slice(0, 3).map((item) => item.variety).filter(Boolean);
  if (language === 'te') {
    return varieties.length
      ? `${displayCrop(crop, language)} కోసం అందుబాటులో ఉన్న విత్తన రకాలు: ${varieties.join(', ')}. ధర మరియు అందుబాటును అధికారిక స్థానిక సరఫరాదారితో నిర్ధారించండి.`
      : `${displayCrop(crop, language)} కోసం ధృవీకరించిన విత్తన రకాలు కనిపించలేదు. స్థానిక అధికారిక సరఫరాదారితో నిర్ధారించండి.`;
  }
  return varieties.length
    ? `Available seed varieties for ${crop}: ${varieties.join(', ')}. Verify current availability and price with an authorized local supplier.`
    : `No verified seed varieties were returned for ${crop}. Verify options with an authorized local supplier.`;
}

function farmCalculationInput(question, profile) {
  const area = areaFromText(question, profile);
  const expectedYieldPerAcre = firstNumber(question, [
    /(\d+(?:\.\d+)?)\s*(?:quintals?|q|kg)?\s*(?:per|\/)\s*(?:acres?|acre|ఎకర(?:ం|ాలు)?)/iu
  ]) ?? numberAfter(question, ['expected yield per acre', 'yield per acre', 'దిగుబడి']);
  const sellingPrice = numberAfter(question, ['selling price', 'price', 'rate', 'అమ్మకపు ధర', 'ధర']);
  const costs = {
    seedCost: numberAfter(question, ['seed cost', 'విత్తన ఖర్చు']) ?? 0,
    fertilizerCost: numberAfter(question, ['fertilizer cost', 'ఎరువు ఖర్చు']) ?? 0,
    pesticideCost: numberAfter(question, ['pesticide cost', 'పురుగుమందు ఖర్చు']) ?? 0,
    labourCost: numberAfter(question, ['labour cost', 'labor cost', 'కూలీ ఖర్చు']) ?? 0,
    irrigationCost: numberAfter(question, ['irrigation cost', 'నీటిపారుదల ఖర్చు']) ?? 0,
    otherCost: numberAfter(question, ['other cost', 'ఇతర ఖర్చు']) ?? 0
  };
  const input = { area, expectedYieldPerAcre, sellingPrice, areaUnit: profile?.areaUnit || 'acre', currency: 'INR', ...costs };
  const missing = [];
  if (area === null) missing.push('farm area');
  if (expectedYieldPerAcre === null) missing.push('expected yield per acre');
  if (sellingPrice === null) missing.push('selling price');
  return { input, missing };
}

function farmCalculationReply(result, language) {
  if (language === 'te') {
    return `పొలం లెక్కింపు: ఉత్పత్తి ${result.production}, ఆదాయం ₹${result.revenue}, మొత్తం ఖర్చు ₹${result.totalCost}, లాభం ₹${result.profit}. మీరు ఇవ్వని ఖర్చు విభాగాలను సున్నాగా లెక్కించాం.`;
  }
  return `Farm calculation: production ${result.production}, revenue ₹${result.revenue}, total cost ₹${result.totalCost}, profit ₹${result.profit}. Any omitted cost categories were treated as zero.`;
}

function pesticideCalculationInput(question, profile) {
  const farmArea = areaFromText(question, profile);
  const verifiedDosage = numberAfter(question, ['verified dosage', 'label dosage', 'dosage', 'dose', 'మోతాదు', 'డోసు']) ?? firstNumber(question, [
    /(\d+(?:\.\d+)?)\s*(?:g|ml)\s*(?:per|\/)\s*(?:acres?|acre|ఎకర(?:ం|ాలు)?)/iu
  ]);
  const waterPerAcre = numberAfter(question, ['water per acre', 'water volume', 'నీరు', 'నీటి పరిమాణం']) ?? firstNumber(question, [
    /(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\s*(?:per|\/)\s*(?:acres?|acre|ఎకర(?:ం|ాలు)?)/iu
  ]);
  const tankCapacity = numberAfter(question, ['tank capacity', 'tank', 'ట్యాంక్']) ?? firstNumber(question, [
    /(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\s*(?:tank|ట్యాంక్)/iu
  ]);
  const input = { farmArea, verifiedDosage, waterPerAcre, tankCapacity, areaUnit: profile?.areaUnit || 'acre', dosageUnit: 'verified label units per acre' };
  const missing = [];
  if (farmArea === null) missing.push('farm area');
  if (verifiedDosage === null) missing.push('verified label dosage');
  if (waterPerAcre === null) missing.push('water per acre');
  if (tankCapacity === null) missing.push('tank capacity');
  return { input, missing };
}

function pesticideCalculationReply(result, language) {
  if (language === 'te') {
    return `లేబుల్ మోతాదు లెక్కింపు: మొత్తం ఉత్పత్తి ${result.totalProduct} ${result.dosageUnit}, మొత్తం నీరు ${result.totalWater} ${result.waterUnit}, ట్యాంకులు ${result.tanks}. ఉత్పత్తి లేబుల్‌ను మళ్లీ ధృవీకరించండి.`;
  }
  return `Label-dosage calculation: total product ${result.totalProduct} ${result.dosageUnit}, total water ${result.totalWater} ${result.waterUnit}, tanks needed ${result.tanks}. Verify the product label before application.`;
}

function seasonFromText(question, profile) {
  const text = normalize(question);
  if (hasAny(text, ['kharif', 'ఖరీఫ్'])) return 'Kharif';
  if (hasAny(text, ['rabi', 'రబీ'])) return 'Rabi';
  if (hasAny(text, ['summer', 'వేసవి'])) return 'Summer';
  return profile?.season || null;
}

function stateFromText(question, profile) {
  const text = normalize(question);
  if (hasAny(text, ['telangana', 'తెలంగాణ'])) return 'Telangana';
  const location = String(profile?.location || '');
  if (/telangana/i.test(location)) return 'Telangana';
  return null;
}

function yieldInput(question, profile) {
  const yearMatch = /\b(20\d{2})\b/u.exec(question);
  const input = {
    currentCrop: cropFromText(question, profile),
    farmArea: areaFromText(question, profile),
    Season: seasonFromText(question, profile),
    state: stateFromText(question, profile),
    rainfall_mm: numberAfter(question, ['annual rainfall', 'వార్షిక వర్షపాతం']),
    temperature_C: numberAfter(question, ['average temperature', 'avg temperature', 'సగటు ఉష్ణోగ్రత']),
    year: yearMatch ? numberOrNull(yearMatch[1]) : null
  };
  const labels = {
    currentCrop: 'crop', farmArea: 'farm area', Season: 'season', state: 'state',
    rainfall_mm: 'annual rainfall', temperature_C: 'average temperature', year: 'year'
  };
  return { input, missing: Object.entries(input).filter(([, value]) => value === null || value === '').map(([key]) => labels[key]) };
}

function yieldReply(result, language) {
  if (language === 'te') {
    return `స్థానిక దిగుబడి మోడల్ అంచనా: ${result.predictedYield} ${result.yieldUnit}. పొలం ఉత్పత్తి అంచనా: ${result.estimatedProduction ?? 'అందుబాటులో లేదు'} ${result.yieldUnit}. ఇది అంచనా మాత్రమే; పొలంలో నిజమైన ఫలితం భిన్నంగా ఉండవచ్చు.`;
  }
  return `Local yield-model estimate: ${result.predictedYield} ${result.yieldUnit}. Estimated farm production: ${result.estimatedProduction ?? 'not available'} ${result.yieldUnit}. This is a model estimate, not a guaranteed field result.`;
}

function serviceFailure(intent, language, action) {
  return makeResponse(intent, language, localized(
    language,
    'That local service is not available right now. Please try its dedicated page again later.',
    'ఆ స్థానిక సేవ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి తర్వాత దాని ప్రత్యేక పేజీలో మళ్లీ ప్రయత్నించండి.'
  ), { action });
}

async function askCopilot({ question, language, profile, weather }) {
  const cleanQuestion = String(question || '').trim();
  if (!cleanQuestion) throw new AppError(422, 'INVALID_COPILOT_QUESTION', 'Please enter a farming question.');

  const detectedLanguage = detectLanguage(cleanQuestion, language);
  const intent = detectIntent(cleanQuestion);
  const crop = cropFromText(cleanQuestion, profile);

  if (intent === 'weather') {
    const liveWeather = await getWeather(profile, weather);
    return makeResponse('weather', detectedLanguage, weatherReply(liveWeather, detectedLanguage), {
      sources: liveWeather ? ['AgriSaathi weather service'] : [], action: { route: 'weather' }
    });
  }

  if (intent === 'irrigation') {
    const liveWeather = await getWeather(profile, weather);
    if (!liveWeather) {
      return makeResponse('irrigation', detectedLanguage, localized(
        detectedLanguage,
        'Save a farm profile with coordinates so the irrigation advisor can use live weather.',
        'నీటిపారుదల సలహాదారు ప్రత్యక్ష వాతావరణాన్ని ఉపయోగించడానికి కోఆర్డినేట్లతో పొలం ప్రొఫైల్‌ను సేవ్ చేయండి.'
      ), { action: { route: 'irrigation' } });
    }
    const soilMoisture = numberAfter(cleanQuestion, ['soil moisture', 'moisture', 'నేల తేమ']);
    const advice = irrigationAdvice({
      crop, cropStage: stageFromText(cleanQuestion), soilMoisture,
      soilType: profile?.soilType, waterSource: profile?.waterSource
    }, liveWeather);
    return makeResponse('irrigation', detectedLanguage, irrigationReply(advice, detectedLanguage), {
      sources: ['AgriSaathi irrigation advisor', 'AgriSaathi weather service'],
      action: { route: 'irrigation' }, data: { decision: advice.decision }
    });
  }

  if (intent === 'fertilizer') {
    if (!crop) {
      return makeResponse('fertilizer', detectedLanguage, localized(
        detectedLanguage,
        'Please name the crop so I can use the fertilizer advisor.',
        'ఎరువు సలహాదారును ఉపయోగించడానికి దయచేసి పంట పేరును చెప్పండి.'
      ), { action: { route: 'fertilizer' } });
    }
    const result = fertilizerAdvice({
      crop, growthStage: stageFromText(cleanQuestion),
      nitrogen: numberAfter(cleanQuestion, ['nitrogen', 'నత్రజని']) ?? numberOrNull(profile?.nitrogen),
      phosphorus: numberAfter(cleanQuestion, ['phosphorus', 'భాస్వరం']) ?? numberOrNull(profile?.phosphorus),
      potassium: numberAfter(cleanQuestion, ['potassium', 'పొటాషియం']) ?? numberOrNull(profile?.potassium)
    });
    return makeResponse('fertilizer', detectedLanguage, fertilizerReply(result, detectedLanguage), {
      sources: ['AgriSaathi fertilizer advisor'], action: { route: 'fertilizer' }
    });
  }

  if (intent === 'seed') {
    if (!crop) {
      return makeResponse('seed', detectedLanguage, localized(
        detectedLanguage,
        'Please name the crop for seed-variety suggestions.',
        'విత్తన రకాల సూచనల కోసం దయచేసి పంట పేరును చెప్పండి.'
      ), { action: { route: 'crop' } });
    }
    try {
      const result = await getSeedRecommendations({
        crop, location: profile?.location, soil: profile?.soilType, season: profile?.season,
        farmArea: profile?.farmArea, waterAvailability: profile?.waterSource
      });
      return makeResponse('seed', detectedLanguage, seedReply(result, crop, detectedLanguage), {
        sources: ['AgriSaathi seed catalog'], action: { route: 'crop' }
      });
    } catch {
      return serviceFailure('seed', detectedLanguage, { route: 'crop' });
    }
  }

  if (intent === 'crop_recommendation') {
    const liveWeather = await getWeather(profile, weather);
    const { values, missing } = cropInput(cleanQuestion, profile, liveWeather);
    if (missing.length) {
      return makeResponse('crop_recommendation', detectedLanguage, localized(
        detectedLanguage,
        `I need these measured inputs before running the crop model: ${missing.join(', ')}.`,
        `పంట మోడల్‌ను నడపడానికి ఈ కొలిచిన వివరాలు అవసరం: ${missing.join(', ')}.`
      ), { action: { route: 'crop' } });
    }
    try {
      const result = cropPredict(values);
      return makeResponse('crop_recommendation', detectedLanguage, cropReply(result, detectedLanguage), {
        sources: ['AgriSaathi crop recommendation model'], action: { route: 'crop' }
      });
    } catch {
      return serviceFailure('crop_recommendation', detectedLanguage, { route: 'crop' });
    }
  }

  if (intent === 'yield') {
    const { input, missing } = yieldInput(cleanQuestion, profile);
    if (missing.length) {
      return makeResponse('yield', detectedLanguage, localized(
        detectedLanguage,
        `I need ${missing.join(', ')} before running the yield model. Annual rainfall and average temperature must be supplied; daily weather is not substituted.`,
        `దిగుబడి మోడల్‌ను నడపడానికి ${missing.join(', ')} అవసరం. వార్షిక వర్షపాతం మరియు సగటు ఉష్ణోగ్రతను తప్పనిసరిగా ఇవ్వాలి; రోజువారీ వాతావరణాన్ని వాటికి బదులుగా ఉపయోగించను.`
      ), { action: { route: 'yield' } });
    }
    try {
      const result = await predictYield(input);
      return makeResponse('yield', detectedLanguage, yieldReply(result, detectedLanguage), {
        sources: ['AgriSaathi yield model'], action: { route: 'yield' }
      });
    } catch {
      return serviceFailure('yield', detectedLanguage, { route: 'yield' });
    }
  }

  if (intent === 'farm_calculator') {
    const { input, missing } = farmCalculationInput(cleanQuestion, profile);
    if (missing.length) {
      return makeResponse('farm_calculator', detectedLanguage, localized(
        detectedLanguage,
        `To calculate farm profit, provide ${missing.join(', ')}.`,
        `పొలం లాభాన్ని లెక్కించడానికి ${missing.join(', ')} ఇవ్వండి.`
      ), { action: { route: 'calculator' } });
    }
    try {
      const result = farmCalculation(input);
      return makeResponse('farm_calculator', detectedLanguage, farmCalculationReply(result, detectedLanguage), {
        sources: ['AgriSaathi farm calculator'], action: { route: 'calculator' }
      });
    } catch {
      return serviceFailure('farm_calculator', detectedLanguage, { route: 'calculator' });
    }
  }

  if (intent === 'pesticide_calculator') {
    const { input, missing } = pesticideCalculationInput(cleanQuestion, profile);
    if (missing.length) {
      return makeResponse('pesticide_calculator', detectedLanguage, localized(
        detectedLanguage,
        `For a label calculation, provide ${missing.join(', ')}. Do not use a guessed dosage.`,
        `లేబుల్ లెక్కింపు కోసం ${missing.join(', ')} ఇవ్వండి. ఊహించిన మోతాదును ఉపయోగించవద్దు.`
      ), { action: { route: 'pesticide' } });
    }
    try {
      const result = pesticideCalculation(input);
      return makeResponse('pesticide_calculator', detectedLanguage, pesticideCalculationReply(result, detectedLanguage), {
        sources: ['AgriSaathi pesticide calculator'], action: { route: 'pesticide' }
      });
    } catch {
      return serviceFailure('pesticide_calculator', detectedLanguage, { route: 'pesticide' });
    }
  }

  if (intent === 'crop_health') {
    const health = modelHealth();
    return makeResponse('crop_health', detectedLanguage, localized(
      detectedLanguage,
      'Crop Health needs a clear JPEG, PNG, or WebP image. Open Crop Health and upload the leaf image there; this text-only Copilot does not diagnose disease.',
      'పంట ఆరోగ్య విశ్లేషణకు స్పష్టమైన JPEG, PNG లేదా WebP చిత్రం అవసరం. Crop Health పేజీలో ఆకు చిత్రాన్ని అప్లోడ్ చేయండి; ఈ వచన కోపైలట్ వ్యాధిని నిర్ధారించదు.'
    ), {
      sources: health.disease?.status ? ['AgriSaathi Crop Health'] : [], action: { route: 'health' }
    });
  }

  if (intent === 'pest_management') {
    if (!crop) {
      return makeResponse('pest_management', detectedLanguage, localized(
        detectedLanguage,
        'Please name the crop and the observed pest or symptom for IPM guidance.',
        'IPM మార్గదర్శకత కోసం దయచేసి పంట పేరు మరియు గమనించిన పురుగు లేదా లక్షణాన్ని చెప్పండి.'
      ), { action: { route: 'pest' } });
    }
    const result = generalPestManagement({ crop, problem: cleanQuestion.slice(0, 500) });
    return makeResponse('pest_management', detectedLanguage, pestReply(result, detectedLanguage), {
      sources: ['AgriSaathi pest-management advisor'], action: { route: 'pest' }
    });
  }

  return makeResponse('general', detectedLanguage, localized(
    detectedLanguage,
    'I am a local farm Copilot. Ask about weather, irrigation, fertilizer, seed varieties, crop recommendations, pests, Crop Health, yield, farm profit, or verified-label pesticide calculations.',
    'నేను స్థానిక పొలం కోపైలట్‌ను. వాతావరణం, నీటిపారుదల, ఎరువులు, విత్తన రకాలు, పంట సిఫార్సులు, పురుగు నిర్వహణ, Crop Health, దిగుబడి, పొలం లాభం లేదా ధృవీకరించిన లేబుల్ పురుగుమందు లెక్కింపుల గురించి అడగండి.'
  ));
}

module.exports = { askCopilot, detectIntent, detectLanguage };
