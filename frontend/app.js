(() => {
  'use strict';

  const API_ROOT = '/api';
  const LOCALES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };
  const SPEECH_LOCALES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };
  const RAIN_SIREN_STORAGE_KEY = 'agrisaathi-rain-siren-enabled';
  const RAIN_EVENT_STORAGE_KEY = 'agrisaathi-last-rain-event';
  const RAIN_MONITOR_INTERVAL_MS = 15 * 60 * 1000;
  const DEFAULT_RAIN_RULES = Object.freeze({
    rainProbabilityThreshold: 60,
    rainMmThreshold: 0.5,
    rainWarningMinutes: 60
  });
  const ALLOWED_VIEWS = new Set([
    'dashboard', 'farm', 'weather', 'crop', 'health', 'irrigation', 'yield',
    'fertilizer', 'pest', 'calculator', 'pesticide', 'copilot', 'history', 'status'
  ]);


  
  const en = {
    appName: 'AgriSaathi',
    skipToContent: 'Skip to main content', home: 'AgriSaathi home', openNavigation: 'Open navigation',
    closeNavigation: 'Close navigation', primaryNavigation: 'Primary navigation', language: 'Language',
    checkingSystem: 'Checking system', systemStatusLoaded: 'System status loaded',
    systemUnavailable: 'System unavailable', yourFarm: 'Your farm', farmNotSet: 'Farm profile not set',
    refreshSystem: 'Refresh system', liveDataNotice: 'Information is shown only when supplied by connected services.',
    loadingWorkspace: 'Loading your farm workspace…', loading: 'Loading…', retry: 'Retry', refresh: 'Refresh',
    close: 'Close', save: 'Save', saving: 'Saving…', submit: 'Submit', analyze: 'Analyze image',
    send: 'Send', sending: 'Sending…', calculate: 'Calculate', calculating: 'Calculating…',
    getAdvice: 'Get advice', getRecommendations: 'Get recommendations', askCopilot: 'Ask Copilot',
    requestAccess: 'Enable browser alerts', connectionIssue: 'Could not reach this service.',
    notAvailable: 'Unavailable', noData: 'No data is available yet.', noRecords: 'No saved records are available yet.',
    serviceDataOnly: 'This space shows data returned by the connected service; no example values are used.',
    navDashboard: 'Dashboard', navFarm: 'My farm', navWeather: 'Weather & alerts', navCrop: 'Crop & seed advisor',
    navHealth: 'Crop health', navIrrigation: 'Irrigation', navYield: 'Yield forecast',
    navCalculator: 'Farm calculator', navPesticide: 'Pesticide calculator', navCopilot: 'AI Copilot',
    navHistory: 'History', navStatus: 'System status',
    dashboardTitle: 'Farm decisions, grounded in live information',
    dashboardSubtitle: 'Review your farm profile, connected weather, alerts, and today’s plan in one place.',
    dashboardRefresh: 'Refresh dashboard', profile: 'Farm profile', weather: 'Weather', alerts: 'Alerts',
    todayPlan: "Today's farm plan", actionsToday: 'Actions available', profileReady: 'Profile available',
    profileMissing: 'Set up your profile', weatherUnavailable: 'Weather data temporarily unavailable.',
    planUnavailable: 'Today’s farm plan is temporarily unavailable.', noAlerts: 'No weather alerts were returned.',
    setupFarm: 'Set up farm profile', viewWeather: 'View weather', viewAll: 'View all',
    farmTitle: 'Your farm profile', farmSubtitle: 'Keep the shared details that every decision service uses up to date.',
    farmIntro: 'Only submit information you want the connected decision services to use. Blank fields stay blank; AgriSaathi does not invent farm details.',
    farmerName: 'Farmer name', location: 'Location', latitude: 'Latitude', longitude: 'Longitude',
    farmArea: 'Farm area', soilType: 'Soil type', soilPh: 'Soil pH', nitrogen: 'Nitrogen (N)',
    phosphorus: 'Phosphorus (P)', potassium: 'Potassium (K)', currentCrop: 'Current crop',
    cropVariety: 'Crop variety', plantingDate: 'Planting date', season: 'Season',
    waterSource: 'Water source', irrigationMethod: 'Irrigation method', previousCrop: 'Previous crop',
    previousYield: 'Previous yield', preferredLanguage: 'Preferred language',
    saveProfile: 'Save farm profile', profileSaved: 'Farm profile saved.', profileLoadError: 'Could not load the farm profile.',
    profileSaveError: 'Could not save the farm profile.', optional: 'Optional', required: 'Required',
    coordinatesHint: 'Coordinates allow weather services to use your farm location.',
    nutrientsHint: 'Use values from a real soil test where available.',
    weatherTitle: 'Live weather & farm alerts', weatherSubtitle: 'Weather is requested for the coordinates stored in your farm profile.',
    weatherProfileNeeded: 'Add a location and coordinates in your farm profile before requesting farm weather.',
    openFarmProfile: 'Open farm profile', dataSource: 'Data source', lastUpdated: 'Last updated', timezone: 'Time zone',
    farmCoordinates: 'Farm coordinates', rainSiren: 'Rain siren', rainWarning: 'Rain warning',
    enableRainSiren: 'Enable Rain Siren', disableRainSiren: 'Disable Rain Siren',
    rainSirenEnabled: 'Rain siren enabled.', rainSirenDisabled: 'Rain siren disabled.',
    rainSirenAudioUnavailable: 'Rain siren sound is unavailable. Add frontend/assets/rain-siren.mp3 to enable audio.',
    rainMonitoring: 'Monitoring the live hourly forecast every 15 minutes while this page is open.',
    rainForecastUnavailable: 'Waiting for a live hourly forecast before checking for rain.',
    noMeaningfulRain: 'No meaningful rain is currently forecast.', rainAlert: 'Rain alert',
    rainExpectedIn: 'Rain is expected in approximately {time}.', nextMeaningfulRain: 'Next meaningful rain: {time}.',
    expectedRainfall: 'Expected rainfall', enableRainNotifications: 'Enable Rain Notifications',
    rainNotificationsEnabled: 'Rain notifications enabled.', rainNotificationsNotEnabled: 'Rain notifications are not enabled.',
    rainNotificationTitle: '🌧 Rain expected within 1 hour', rainNotificationBody: 'Rain is expected around {time} at your farm.',
    oneHour: '1 hour', minutes: 'minutes',
    currentConditions: 'Current conditions', forecast: 'Forecast', hourlyForecast: 'Hourly forecast',
    dailyForecast: 'Daily forecast', temperature: 'Temperature', feelsLike: 'Feels like', humidity: 'Humidity',
    rainProbability: 'Rain probability', rainfall: 'Rainfall', windSpeed: 'Wind speed', windDirection: 'Wind direction',
    uvIndex: 'UV index', condition: 'Condition', date: 'Date', time: 'Time', high: 'High', low: 'Low',
    noForecast: 'No forecast was returned by the weather service.', weatherLoadError: 'Could not load live weather.',
    alertsLoadError: 'Could not load weather alerts.', alertTime: 'Expected time', recommendedAction: 'Recommended action',
    expectedCondition: 'Expected condition', requestNotifications: 'Enable browser alerts',
    notificationGranted: 'Browser alert permission is enabled.', notificationDenied: 'Browser alert permission was not granted.',
    notificationUnsupported: 'This browser does not support notification permission.',
    notificationHint: 'Permission only lets this browser receive alerts when the application sends them; it does not create alerts.',
    cropTitle: 'Crop & seed advisor', cropSubtitle: 'Send farm and soil inputs to the connected recommendation services.',
    cropRecommendation: 'Crop recommendation', seedAdvisor: 'Seed advisor',
    cropFormHint: 'Use measured values where possible. Recommendations are shown only after the service responds.',
    seedFormHint: 'Seed pricing and availability are shown only when returned by a verified catalog service.',
    ph: 'pH', ambientTemperature: 'Temperature', waterAvailability: 'Water availability',
    recommendCrops: 'Recommend crops', recommendSeeds: 'Find seed varieties',
    cropResult: 'Crop recommendations', seedResult: 'Seed recommendations', whyRecommended: 'Why recommended',
    suitabilityScore: 'Suitability score', modelProbability: 'Model probability (not calibrated confidence)', reportedConfidence: 'Reported model confidence',
    price: 'Price', priceUnit: 'Price unit', priceUnavailable: 'Price unavailable. Verify with a local supplier.',
    source: 'Source', duration: 'Duration', region: 'Region', seedRequirement: 'Seed requirement', expectedYield: 'Expected yield',
    recommendationUnavailable: 'Crop recommendations are currently unavailable.', seedUnavailable: 'Seed recommendations are currently unavailable.',
    cropModelUnavailable: 'The crop recommendation model is currently unavailable.',
    seedCatalogUnavailable: 'The verified seed catalog is currently unavailable.',
    healthTitle: 'Crop health analysis', healthSubtitle: 'Upload a clear crop image for the connected disease model to analyze.',
    healthIntro: 'An uploaded image is sent only when you choose Analyze image. A diagnosis is never displayed unless the disease service returns one.',
    chooseImage: 'Choose crop image', imageChosen: 'Image ready for analysis.', imageRequired: 'Choose an image before analysis.',
    imagePreview: 'Selected image preview', cropForImage: 'Crop in image', analyzeImage: 'Analyze image', analysisResult: 'Analysis result',
    modelUnavailable: 'The AI disease model is currently unavailable.', lowConfidence: 'Low-confidence result. Please verify with qualified agricultural guidance.',
    voiceExplanation: 'Read explanation aloud', stopSpeaking: 'Stop speaking', speechUnsupported: 'Voice output is not available in this browser.',
    diseaseLoadError: 'The image could not be analyzed.', diseaseName: 'Result', probability: 'Probability', symptoms: 'Symptoms',
    explanation: 'Explanation', organicManagement: 'Organic management', ipm: 'Integrated pest management',
    chemicalManagement: 'Chemical management', prevention: 'Prevention',
    irrigationTitle: 'Irrigation advisor', irrigationSubtitle: 'Request advice using your current crop conditions and supplied moisture information.',
    irrigationHint: 'The advisor can only assess the values you submit and any connected weather information available to it.',
    cropStage: 'Crop stage', soilMoisture: 'Soil moisture', rainForecast: 'Rain forecast',
    irrigationResult: 'Irrigation advice', irrigationUnavailable: 'Irrigation advice is currently unavailable.',
    yieldTitle: 'Yield forecast', yieldSubtitle: 'Request a yield estimate from the connected prediction service.',
    yieldHint: 'Estimates, ranges, and confidence are displayed only when returned by the model service.',
    seedVariety: 'Seed variety', fertilizerInformation: 'Fertilizer information', requestYield: 'Request yield forecast',
    yieldResult: 'Yield forecast result', yieldUnavailable: 'The yield prediction model is currently unavailable.',
    calculatorTitle: 'Farm calculator & what-if scenarios', calculatorSubtitle: 'Send your own costs and assumptions to calculate production, revenue, and profit.',
    calculatorHint: 'Change any field and calculate again to compare a what-if scenario. Results come from the calculation service, not a preset example.',
    expectedYieldPerArea: 'Expected yield per acre', sellingPrice: 'Selling price', seedCost: 'Seed cost',
    fertilizerCost: 'Fertilizer cost', pesticideCost: 'Pesticide cost', labourCost: 'Labour cost',
    irrigationCost: 'Irrigation cost', otherCosts: 'Other costs', calculateFarm: 'Calculate farm outcome',
    calculatorResult: 'Farm calculation', calculationUnavailable: 'Farm calculation is currently unavailable.',
    pesticideTitle: 'Pesticide calculator', pesticideSubtitle: 'Calculate only from a verified product-label dosage that you enter.',
    pesticideHint: 'Do not enter a guessed dosage. Always verify the result against the product label and local agricultural guidance.',
    product: 'Product', activeIngredient: 'Active ingredient', labelDosage: 'Verified label dosage',
    dosageUnit: 'Dosage unit', waterVolumePerAcre: 'Water volume per acre', tankCapacity: 'Tank capacity',
    calculatePesticide: 'Calculate product and water', pesticideResult: 'Pesticide calculation',
    labelWarning: 'Verify against the product label before application.', pesticideUnavailable: 'Pesticide calculation is currently unavailable.',
    copilotTitle: 'AI Farm Copilot', copilotSubtitle: 'Ask a farm question. The connected assistant may use the stored profile and available live context.',
    copilotHint: 'Responses are generated by the configured AI service. If that service is unavailable, this page will say so instead of inventing advice.',
    messageLabel: 'Your farm question', messagePlaceholder: 'Ask about your crop, weather, irrigation, costs, or farm plan…',
    startVoiceInput: 'Start voice input', stopVoiceInput: 'Stop voice input', voiceInputUnsupported: 'Voice input is not available in this browser.',
    listening: 'Listening…', copilotUnavailable: 'The AI Copilot is currently unavailable.', noConversation: 'Ask a question to start a conversation.',
    you: 'You', copilot: 'AgriSaathi Copilot', listenResponse: 'Listen to response',
    historyTitle: 'Farm history', historySubtitle: 'Review records that the connected backend has persisted for your farm.',
    historyHint: 'Only saved backend records appear here.', searchHistory: 'Search saved records', clearSearch: 'Clear search',
    historyLoadError: 'Could not load farm history.', recordType: 'Record type', createdAt: 'Created',
    statusTitle: 'System status', statusSubtitle: 'Inspect the actual status reported by connected backend services.',
    statusHint: 'A successful page load does not imply every service is healthy; the values below are returned by the health endpoint.',
    healthLoadError: 'Could not load system health.', service: 'Service', status: 'Status', details: 'Details',
    noHealthData: 'No health status was returned.',
    generalError: 'Something went wrong. Please try again.', networkError: 'Network connection failed. Check your connection and try again.',
    requestFailed: 'The request could not be completed.', serverResponse: 'Service response',
    formFixErrors: 'Check the highlighted required fields and try again.',
    unknown: 'Unknown', yes: 'Yes', no: 'No', none: 'None',
    backToDashboard: 'Back to dashboard', resultPending: 'Your result will appear here after the service responds.',
    languageSavedDevice: 'Language preference saved on this device.', languageSyncFailed: 'Language changed here, but could not be saved to the farm profile.',
    noImage: 'No image selected', removeImage: 'Remove image',
    responseSources: 'Sources', actions: 'Actions',
    readOnlyField: 'Returned data',
    processing: 'Processing…', requestInProgress: 'A request is in progress.',
    browserOffline: 'You appear to be offline.', browserOnline: 'Connection restored.',
    healthBackend: 'Backend', healthDatabase: 'Database', healthWeather: 'Weather provider', healthAi: 'AI service', healthMl: 'ML service',
    navFertilizer: 'Fertilizer advisor', navPest: 'Pest management', crop: 'Crop', growthStage: 'Growth stage',
    fertilizerTitle: 'Fertilizer advisor', fertilizerSubtitle: 'Review recorded soil nutrients without generating an unverified fertilizer rate.',
    fertilizerHint: 'Enter N, P and K values if you have a soil test. They are optional and help refine the advice. This tool records values for review; it does not prescribe fertilizer dosage.',
    requestFertilizerAdvice: 'Review nutrient record', fertilizerResult: 'Fertilizer advice', fertilizerUnavailable: 'Fertilizer advice is currently unavailable.',
    pestTitle: 'Pest management', pestSubtitle: 'Get general integrated pest-management steps for a reported field concern.',
    pestHint: 'This is not a diagnosis or a pesticide-label recommendation. Inspect the issue and verify any treatment locally.',
    problem: 'Observed pest or disease concern', requestPestGuidance: 'Get IPM guidance', pestResult: 'Pest management guidance', pestUnavailable: 'Pest management guidance is currently unavailable.',
    nutrientFindings: 'Recorded nutrient values', recordedValue: 'Recorded value', management: 'Management', disclaimer: 'Disclaimer',
    scope: 'Scope', recommendations: 'Recommendations', priority: 'Priority', why: 'Why', how: 'How', when: 'When', pesticideNotice: 'Pesticide notice'
  };

  const te = {
    appName: 'అగ్రిసాథి', skipToContent: 'ప్రధాన విషయానికి వెళ్లండి', home: 'అగ్రిసాథి హోమ్', openNavigation: 'నావిగేషన్ తెరవండి',
    closeNavigation: 'నావిగేషన్ మూసివేయండి', primaryNavigation: 'ప్రధాన నావిగేషన్', language: 'భాష',
    checkingSystem: 'వ్యవస్థను పరిశీలిస్తోంది', systemStatusLoaded: 'వ్యవస్థ స్థితి అందింది', systemUnavailable: 'వ్యవస్థ అందుబాటులో లేదు',
    yourFarm: 'మీ పొలం', farmNotSet: 'పొలం వివరాలు సెట్ చేయలేదు', refreshSystem: 'వ్యవస్థను రిఫ్రెష్ చేయండి',
    liveDataNotice: 'కనెక్ట్ చేసిన సేవలు అందించిన సమాచారం మాత్రమే చూపబడుతుంది.', loadingWorkspace: 'మీ పొలం కార్యస్థలాన్ని లోడ్ చేస్తోంది…',
    loading: 'లోడ్ చేస్తోంది…', retry: 'మళ్లీ ప్రయత్నించండి', refresh: 'రిఫ్రెష్', close: 'మూసివేయండి', save: 'సేవ్ చేయండి',
    saving: 'సేవ్ చేస్తోంది…', submit: 'సమర్పించండి', analyze: 'చిత్రాన్ని విశ్లేషించండి', send: 'పంపండి', sending: 'పంపుతోంది…',
    calculate: 'లెక్కించండి', calculating: 'లెక్కిస్తోంది…', getAdvice: 'సలహా పొందండి', getRecommendations: 'సిఫార్సులు పొందండి',
    askCopilot: 'కోపైలట్‌ను అడగండి', requestAccess: 'బ్రౌజర్ హెచ్చరికలు ప్రారంభించండి', connectionIssue: 'ఈ సేవను చేరుకోలేకపోయాము.',
    notAvailable: 'అందుబాటులో లేదు', noData: 'ఇంకా సమాచారం అందుబాటులో లేదు.', noRecords: 'ఇంకా భద్రపరిచిన రికార్డులు లేవు.',
    serviceDataOnly: 'కనెక్ట్ చేసిన సేవ ఇచ్చిన సమాచారం మాత్రమే ఇక్కడ చూపబడుతుంది; ఉదాహరణ విలువలు ఉపయోగించబడవు.',
    navDashboard: 'డాష్‌బోర్డ్', navFarm: 'నా పొలం', navWeather: 'వాతావరణం & హెచ్చరికలు', navCrop: 'పంట & విత్తన సలహాదారు',
    navHealth: 'పంట ఆరోగ్యం', navIrrigation: 'నీటిపారుదల', navYield: 'దిగుబడి అంచనా', navCalculator: 'పొలం కాలిక్యులేటర్',
    navPesticide: 'పురుగుమందు కాలిక్యులేటర్', navCopilot: 'AI కోపైలట్', navHistory: 'చరిత్ర', navStatus: 'వ్యవస్థ స్థితి',
    dashboardTitle: 'ప్రత్యక్ష సమాచారంపై ఆధారపడిన పొలం నిర్ణయాలు', dashboardSubtitle: 'మీ పొలం వివరాలు, కనెక్ట్ చేసిన వాతావరణం, హెచ్చరికలు మరియు నేటి ప్రణాళికను ఒకే చోట చూడండి.',
    dashboardRefresh: 'డాష్‌బోర్డ్ రిఫ్రెష్ చేయండి', profile: 'పొలం వివరాలు', weather: 'వాతావరణం', alerts: 'హెచ్చరికలు', todayPlan: 'నేటి పొలం ప్రణాళిక',
    actionsToday: 'అందుబాటులో ఉన్న చర్యలు', profileReady: 'వివరాలు అందుబాటులో ఉన్నాయి', profileMissing: 'మీ వివరాలు సెట్ చేయండి',
    weatherUnavailable: 'వాతావరణ సమాచారం తాత్కాలికంగా అందుబాటులో లేదు.', planUnavailable: 'నేటి పొలం ప్రణాళిక తాత్కాలికంగా అందుబాటులో లేదు.',
    noAlerts: 'వాతావరణ హెచ్చరికలు ఏవీ అందలేదు.', setupFarm: 'పొలం వివరాలు సెట్ చేయండి', viewWeather: 'వాతావరణం చూడండి', viewAll: 'అన్నీ చూడండి',
    farmTitle: 'మీ పొలం వివరాలు', farmSubtitle: 'ప్రతి నిర్ణయ సేవ ఉపయోగించే ఉమ్మడి వివరాలను తాజాగా ఉంచండి.',
    farmIntro: 'కనెక్ట్ చేసిన నిర్ణయ సేవలు ఉపయోగించాలనుకున్న సమాచారాన్ని మాత్రమే సమర్పించండి. ఖాళీ ఫీల్డ్‌లు ఖాళీగానే ఉంటాయి; అగ్రిసాథి పొలం వివరాలను ఊహించదు.',
    farmerName: 'రైతు పేరు', location: 'ప్రాంతం', latitude: 'అక్షాంశం', longitude: 'రేఖాంశం', farmArea: 'పొలం విస్తీర్ణం',
    soilType: 'నేల రకం', soilPh: 'నేల pH', nitrogen: 'నత్రజని (N)', phosphorus: 'భాస్వరం (P)', potassium: 'పొటాషియం (K)',
    currentCrop: 'ప్రస్తుత పంట', cropVariety: 'పంట రకం', plantingDate: 'నాటిన తేదీ', season: 'సీజన్', waterSource: 'నీటి వనరు',
    irrigationMethod: 'నీటిపారుదల పద్ధతి', previousCrop: 'మునుపటి పంట', previousYield: 'మునుపటి దిగుబడి', preferredLanguage: 'ఇష్ట భాష',
    saveProfile: 'పొలం వివరాలు సేవ్ చేయండి', profileSaved: 'పొలం వివరాలు సేవ్ అయ్యాయి.', profileLoadError: 'పొలం వివరాలు లోడ్ కాలేదు.',
    profileSaveError: 'పొలం వివరాలు సేవ్ కాలేదు.', optional: 'ఐచ్ఛికం', required: 'అవసరం', coordinatesHint: 'కోఆర్డినేట్లు వాతావరణ సేవలు మీ పొలం ప్రాంతాన్ని ఉపయోగించడానికి సహాయపడతాయి.',
    nutrientsHint: 'అందుబాటులో ఉన్నప్పుడు నిజమైన నేల పరీక్ష విలువలను ఉపయోగించండి.', weatherTitle: 'ప్రత్యక్ష వాతావరణం & పొలం హెచ్చరికలు',
    weatherSubtitle: 'మీ పొలం వివరాల్లో భద్రపరిచిన కోఆర్డినేట్ల కోసం వాతావరణం అభ్యర్థించబడుతుంది.',
    weatherProfileNeeded: 'పొలం వాతావరణాన్ని అభ్యర్థించే ముందు పొలం వివరాల్లో ప్రాంతం మరియు కోఆర్డినేట్లు జోడించండి.',
    openFarmProfile: 'పొలం వివరాలు తెరవండి', dataSource: 'డేటా మూలం', lastUpdated: 'చివరిసారి నవీకరించినది', timezone: 'సమయ మండలం',
    currentConditions: 'ప్రస్తుత పరిస్థితులు', forecast: 'అంచనా', hourlyForecast: 'గంటల అంచనా', dailyForecast: 'రోజువారీ అంచనా',
    temperature: 'ఉష్ణోగ్రత', feelsLike: 'అనిపించే ఉష్ణోగ్రత', humidity: 'తేమ', rainProbability: 'వర్ష సంభావ్యత', rainfall: 'వర్షపాతం',
    windSpeed: 'గాలి వేగం', windDirection: 'గాలి దిశ', uvIndex: 'UV సూచిక', condition: 'పరిస్థితి', date: 'తేదీ', time: 'సమయం', high: 'అధికం', low: 'తక్కువ',
    noForecast: 'వాతావరణ సేవ ఎటువంటి అంచనాను అందించలేదు.', weatherLoadError: 'ప్రత్యక్ష వాతావరణాన్ని లోడ్ చేయలేకపోయాము.', alertsLoadError: 'వాతావరణ హెచ్చరికలను లోడ్ చేయలేకపోయాము.',
    alertTime: 'అంచనా సమయం', recommendedAction: 'సిఫార్సు చేసిన చర్య', expectedCondition: 'అంచనా పరిస్థితి', requestNotifications: 'బ్రౌజర్ హెచ్చరికలు ప్రారంభించండి',
    notificationGranted: 'బ్రౌజర్ హెచ్చరిక అనుమతి ప్రారంభించబడింది.', notificationDenied: 'బ్రౌజర్ హెచ్చరిక అనుమతి ఇవ్వబడలేదు.',
    notificationUnsupported: 'ఈ బ్రౌజర్ నోటిఫికేషన్ అనుమతిని మద్దతు ఇవ్వదు.', notificationHint: 'అనుమతి అప్లికేషన్ పంపినప్పుడు మాత్రమే ఈ బ్రౌజర్‌కు హెచ్చరికలను అందిస్తుంది; కొత్త హెచ్చరికలను సృష్టించదు.',
    cropTitle: 'పంట & విత్తన సలహాదారు', cropSubtitle: 'కనెక్ట్ చేసిన సిఫార్సు సేవలకు పొలం మరియు నేల ఇన్‌పుట్‌లను పంపండి.',
    cropRecommendation: 'పంట సిఫార్సు', seedAdvisor: 'విత్తన సలహాదారు', cropFormHint: 'సాధ్యమైన చోట కొలిచిన విలువలను ఉపయోగించండి. సేవ స్పందించిన తర్వాతే సిఫార్సులు చూపబడతాయి.',
    seedFormHint: 'ధృవీకరించిన కేటలాగ్ సేవ తిరిగి ఇచ్చినప్పుడు మాత్రమే విత్తన ధరలు మరియు లభ్యత చూపబడతాయి.', ph: 'pH', ambientTemperature: 'ఉష్ణోగ్రత',
    waterAvailability: 'నీటి లభ్యత', recommendCrops: 'పంటలను సిఫార్సు చేయండి', recommendSeeds: 'విత్తన రకాలను కనుగొనండి',
    cropResult: 'పంట సిఫార్సులు', seedResult: 'విత్తన సిఫార్సులు', whyRecommended: 'ఎందుకు సిఫార్సు చేశారు', suitabilityScore: 'అనుకూలత స్కోరు',
    modelProbability: 'మోడల్ సంభావ్యత (క్యాలిబ్రేట్ చేసిన విశ్వాసం కాదు)', reportedConfidence: 'నివేదించిన మోడల్ విశ్వసనీయత', price: 'ధర', priceUnit: 'ధర యూనిట్', priceUnavailable: 'ధర అందుబాటులో లేదు. స్థానిక సరఫరాదారునితో నిర్ధారించండి.',
    source: 'మూలం', duration: 'వ్యవధి', region: 'ప్రాంతం', seedRequirement: 'విత్తన అవసరం', expectedYield: 'ఆశించిన దిగుబడి',
    recommendationUnavailable: 'పంట సిఫార్సులు ప్రస్తుతం అందుబాటులో లేవు.', seedUnavailable: 'ధృవీకరించిన విత్తన కేటలాగ్ ప్రస్తుతం అందుబాటులో లేదు.',
    cropModelUnavailable: 'పంట సిఫార్సు మోడల్ ప్రస్తుతం అందుబాటులో లేదు.', seedCatalogUnavailable: 'ధృవీకరించిన విత్తన కేటలాగ్ ప్రస్తుతం అందుబాటులో లేదు.',
    healthTitle: 'పంట ఆరోగ్య విశ్లేషణ', healthSubtitle: 'కనెక్ట్ చేసిన వ్యాధి మోడల్ విశ్లేషించడానికి స్పష్టమైన పంట చిత్రాన్ని అప్‌లోడ్ చేయండి.',
    healthIntro: 'మీరు చిత్రాన్ని విశ్లేషించు ఎంచుకున్నప్పుడు మాత్రమే చిత్రం పంపబడుతుంది. వ్యాధి సేవ ఫలితాన్ని ఇచ్చే వరకు నిర్ధారణ చూపబడదు.',
    chooseImage: 'పంట చిత్రం ఎంచుకోండి', imageChosen: 'చిత్రం విశ్లేషణకు సిద్ధంగా ఉంది.', imageRequired: 'విశ్లేషణకు ముందు చిత్రాన్ని ఎంచుకోండి.',
    imagePreview: 'ఎంచుకున్న చిత్ర ప్రివ్యూ', cropForImage: 'చిత్రంలోని పంట', analyzeImage: 'చిత్రాన్ని విశ్లేషించండి', analysisResult: 'విశ్లేషణ ఫలితం',
    modelUnavailable: 'AI వ్యాధి మోడల్ ప్రస్తుతం అందుబాటులో లేదు.', lowConfidence: 'తక్కువ విశ్వసనీయత ఫలితం. అర్హత కలిగిన వ్యవసాయ మార్గదర్శకంతో నిర్ధారించండి.',
    voiceExplanation: 'వివరణను చదివి వినిపించండి', stopSpeaking: 'చదవడం ఆపండి', speechUnsupported: 'ఈ బ్రౌజర్‌లో వాయిస్ అవుట్‌పుట్ అందుబాటులో లేదు.',
    diseaseLoadError: 'చిత్రాన్ని విశ్లేషించలేకపోయాము.', diseaseName: 'ఫలితం', probability: 'సంభావ్యత', symptoms: 'లక్షణాలు',
    explanation: 'వివరణ', organicManagement: 'సేంద్రియ నిర్వహణ', ipm: 'సమగ్ర పురుగు నిర్వహణ', chemicalManagement: 'రసాయన నిర్వహణ', prevention: 'నివారణ',
    irrigationTitle: 'నీటిపారుదల సలహాదారు', irrigationSubtitle: 'ప్రస్తుత పంట పరిస్థితులు మరియు మీరు ఇచ్చిన తేమ సమాచారంతో సలహాను అభ్యర్థించండి.',
    irrigationHint: 'సలహాదారు మీరు సమర్పించిన విలువలను మరియు అందుబాటులో ఉన్న కనెక్ట్ చేసిన వాతావరణ సమాచారాన్ని మాత్రమే అంచనా వేయగలడు.',
    cropStage: 'పంట దశ', soilMoisture: 'నేల తేమ', rainForecast: 'వర్ష అంచనా', irrigationResult: 'నీటిపారుదల సలహా', irrigationUnavailable: 'నీటిపారుదల సలహా ప్రస్తుతం అందుబాటులో లేదు.',
    yieldTitle: 'దిగుబడి అంచనా', yieldSubtitle: 'కనెక్ట్ చేసిన అంచనా సేవ నుండి దిగుబడి అంచనాను అభ్యర్థించండి.',
    yieldHint: 'మోడల్ సేవ తిరిగి ఇచ్చినప్పుడు మాత్రమే అంచనాలు, పరిధులు మరియు విశ్వసనీయత చూపబడతాయి.', seedVariety: 'విత్తన రకం',
    fertilizerInformation: 'ఎరువు సమాచారం', requestYield: 'దిగుబడి అంచనాను అభ్యర్థించండి', yieldResult: 'దిగుబడి అంచనా ఫలితం', yieldUnavailable: 'దిగుబడి అంచనా మోడల్ ప్రస్తుతం అందుబాటులో లేదు.',
    calculatorTitle: 'పొలం కాలిక్యులేటర్ & ఏమైతే-అనే దృశ్యాలు', calculatorSubtitle: 'ఉత్పత్తి, ఆదాయం మరియు లాభం లెక్కించడానికి మీ స్వంత ఖర్చులు మరియు అంచనాలను పంపండి.',
    calculatorHint: 'ఏ ఫీల్డ్‌నైనా మార్చి మళ్లీ లెక్కించండి. ఫలితాలు ముందుగా సెట్ చేసిన ఉదాహరణ నుండి కాదు, లెక్కింపు సేవ నుండి వస్తాయి.',
    expectedYieldPerArea: 'ఎకరానికి ఆశించిన దిగుబడి', sellingPrice: 'అమ్మకపు ధర', seedCost: 'విత్తన ఖర్చు', fertilizerCost: 'ఎరువు ఖర్చు',
    pesticideCost: 'పురుగుమందు ఖర్చు', labourCost: 'కూలీ ఖర్చు', irrigationCost: 'నీటిపారుదల ఖర్చు', otherCosts: 'ఇతర ఖర్చులు',
    calculateFarm: 'పొలం ఫలితాన్ని లెక్కించండి', calculatorResult: 'పొలం లెక్కింపు', calculationUnavailable: 'పొలం లెక్కింపు ప్రస్తుతం అందుబాటులో లేదు.',
    pesticideTitle: 'పురుగుమందు కాలిక్యులేటర్', pesticideSubtitle: 'మీరు ఇచ్చిన ధృవీకరించిన ఉత్పత్తి-లేబుల్ మోతాదు నుండి మాత్రమే లెక్కించండి.',
    pesticideHint: 'ఊహించిన మోతాదును నమోదు చేయవద్దు. ఫలితాన్ని ఎల్లప్పుడూ ఉత్పత్తి లేబుల్ మరియు స్థానిక వ్యవసాయ మార్గదర్శకంతో నిర్ధారించండి.',
    product: 'ఉత్పత్తి', activeIngredient: 'క్రియాశీల పదార్థం', labelDosage: 'ధృవీకరించిన లేబుల్ మోతాదు', dosageUnit: 'మోతాదు యూనిట్',
    waterVolumePerAcre: 'ఎకరానికి నీటి పరిమాణం', tankCapacity: 'ట్యాంక్ సామర్థ్యం', calculatePesticide: 'ఉత్పత్తి మరియు నీటిని లెక్కించండి',
    pesticideResult: 'పురుగుమందు లెక్కింపు', labelWarning: 'వర్తించే ముందు ఉత్పత్తి లేబుల్‌తో నిర్ధారించండి.', pesticideUnavailable: 'పురుగుమందు లెక్కింపు ప్రస్తుతం అందుబాటులో లేదు.',
    copilotTitle: 'AI పొలం కోపైలట్', copilotSubtitle: 'పొలం ప్రశ్న అడగండి. కనెక్ట్ చేసిన సహాయకుడు భద్రపరిచిన వివరాలు మరియు అందుబాటులో ఉన్న ప్రత్యక్ష సందర్భాన్ని ఉపయోగించవచ్చు.',
    copilotHint: 'సమాధానాలు కాన్ఫిగర్ చేసిన AI సేవ ద్వారా తయారవుతాయి. సేవ అందుబాటులో లేకపోతే, ఈ పేజీ సలహాను ఊహించకుండా తెలియజేస్తుంది.',
    messageLabel: 'మీ పొలం ప్రశ్న', messagePlaceholder: 'మీ పంట, వాతావరణం, నీటిపారుదల, ఖర్చులు లేదా పొలం ప్రణాళిక గురించి అడగండి…',
    startVoiceInput: 'వాయిస్ ఇన్‌పుట్ ప్రారంభించండి', stopVoiceInput: 'వాయిస్ ఇన్‌పుట్ ఆపండి', voiceInputUnsupported: 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు.',
    listening: 'వింటోంది…', copilotUnavailable: 'AI కోపైలట్ ప్రస్తుతం అందుబాటులో లేదు.', noConversation: 'సంభాషణ ప్రారంభించడానికి ప్రశ్న అడగండి.',
    you: 'మీరు', copilot: 'అగ్రిసాథి కోపైలట్', listenResponse: 'సమాధానం వినండి',
    historyTitle: 'పొలం చరిత్ర', historySubtitle: 'మీ పొలం కోసం కనెక్ట్ చేసిన బ్యాకెండ్ భద్రపరిచిన రికార్డులను చూడండి.',
    historyHint: 'బ్యాకెండ్‌లో భద్రపరిచిన రికార్డులు మాత్రమే ఇక్కడ కనిపిస్తాయి.', searchHistory: 'భద్రపరిచిన రికార్డులను వెతకండి', clearSearch: 'శోధనను క్లియర్ చేయండి',
    historyLoadError: 'పొలం చరిత్రను లోడ్ చేయలేకపోయాము.', recordType: 'రికార్డు రకం', createdAt: 'సృష్టించినది',
    statusTitle: 'వ్యవస్థ స్థితి', statusSubtitle: 'కనెక్ట్ చేసిన బ్యాకెండ్ సేవలు నివేదించిన వాస్తవ స్థితిని పరిశీలించండి.',
    statusHint: 'పేజీ విజయవంతంగా లోడ్ అయినంత మాత్రాన ప్రతి సేవ ఆరోగ్యంగా ఉందని కాదు; క్రింది విలువలు హెల్త్ ఎండ్‌పాయింట్ ద్వారా తిరిగి ఇవ్వబడతాయి.',
    healthLoadError: 'వ్యవస్థ ఆరోగ్యాన్ని లోడ్ చేయలేకపోయాము.', service: 'సేవ', status: 'స్థితి', details: 'వివరాలు', noHealthData: 'ఆరోగ్య స్థితి ఏదీ అందలేదు.',
    generalError: 'ఏదో తప్పు జరిగింది. మళ్లీ ప్రయత్నించండి.', networkError: 'నెట్‌వర్క్ కనెక్షన్ విఫలమైంది. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
    requestFailed: 'అభ్యర్థనను పూర్తి చేయలేకపోయాము.', serverResponse: 'సేవ స్పందన', formFixErrors: 'హైలైట్ చేసిన అవసరమైన ఫీల్డ్‌లను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
    unknown: 'తెలియదు', yes: 'అవును', no: 'కాదు', none: 'ఏదీ లేదు', backToDashboard: 'డాష్‌బోర్డ్‌కు తిరిగి వెళ్లండి',
    resultPending: 'సేవ స్పందించిన తర్వాత మీ ఫలితం ఇక్కడ కనిపిస్తుంది.', languageSavedDevice: 'భాష ప్రాధాన్యత ఈ పరికరంలో సేవ్ అయింది.',
    languageSyncFailed: 'భాష ఇక్కడ మార్చబడింది, కానీ పొలం వివరాల్లో సేవ్ చేయలేకపోయాము.', noImage: 'చిత్రం ఎంచుకోలేదు', removeImage: 'చిత్రాన్ని తొలగించండి',
    responseSources: 'మూలాలు', actions: 'చర్యలు', readOnlyField: 'తిరిగి ఇచ్చిన సమాచారం', processing: 'ప్రాసెస్ చేస్తోంది…',
    requestInProgress: 'ఒక అభ్యర్థన ప్రగతిలో ఉంది.', browserOffline: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నట్లు కనిపిస్తోంది.', browserOnline: 'కనెక్షన్ పునరుద్ధరించబడింది.',
    healthBackend: 'బ్యాకెండ్', healthDatabase: 'డేటాబేస్', healthWeather: 'వాతావరణ ప్రొవైడర్', healthAi: 'AI సేవ', healthMl: 'ML సేవ',
    navFertilizer: 'ఎరువుల సలహా', navPest: 'పురుగు నిర్వహణ', crop: 'పంట', growthStage: 'పెరుగుదల దశ',
    fertilizerTitle: 'ఎరువుల సలహాదారు', fertilizerSubtitle: 'ధృవీకరించని ఎరువు మోతాదును రూపొందించకుండా నమోదైన నేల పోషక విలువలను సమీక్షించండి.',
    fertilizerHint: 'అందుబాటులో ఉన్న చోట నేల పరీక్ష విలువలను నమోదు చేయండి. ఈ సాధనం విలువలను సమీక్ష కోసం మాత్రమే చూపుతుంది; ఎరువు మోతాదును సూచించదు.',
    requestFertilizerAdvice: 'పోషక వివరాలు చూడండి', fertilizerResult: 'ఎరువుల సలహా', fertilizerUnavailable: 'ఎరువుల సలహా ప్రస్తుతం అందుబాటులో లేదు.',
    pestTitle: 'పురుగు నిర్వహణ', pestSubtitle: 'నివేదించిన పొలం సమస్యకు సాధారణ సమగ్ర పురుగు నిర్వహణ దశలను పొందండి.',
    pestHint: 'ఇది రోగ నిర్ధారణ లేదా పురుగుమందు లేబుల్ సిఫార్సు కాదు. సమస్యను పరిశీలించి, చికిత్సను స్థానికంగా నిర్ధారించండి.',
    problem: 'గమనించిన పురుగు లేదా వ్యాధి సమస్య', requestPestGuidance: 'IPM మార్గదర్శకత పొందండి', pestResult: 'పురుగు నిర్వహణ మార్గదర్శకత', pestUnavailable: 'పురుగు నిర్వహణ మార్గదర్శకత ప్రస్తుతం అందుబాటులో లేదు.',
    nutrientFindings: 'నమోదైన పోషక విలువలు', recordedValue: 'నమోదైన విలువ', management: 'నిర్వహణ', disclaimer: 'నిరాకరణ',
    scope: 'పరిధి', recommendations: 'సిఫార్సులు', priority: 'ప్రాధాన్యత', why: 'ఎందుకు', how: 'ఎలా', when: 'ఎప్పుడు', pesticideNotice: 'పురుగుమందు గమనిక'
  };

  const hi = {
    appName: 'एग्रीसाथी', skipToContent: 'मुख्य सामग्री पर जाएँ', home: 'एग्रीसाथी होम', openNavigation: 'नेविगेशन खोलें',
    closeNavigation: 'नेविगेशन बंद करें', primaryNavigation: 'मुख्य नेविगेशन', language: 'भाषा', checkingSystem: 'सिस्टम जाँचा जा रहा है',
    systemStatusLoaded: 'सिस्टम स्थिति लोड हुई', systemUnavailable: 'सिस्टम अनुपलब्ध है', yourFarm: 'आपका खेत',
    farmNotSet: 'खेत प्रोफ़ाइल सेट नहीं है', refreshSystem: 'सिस्टम रीफ़्रेश करें',
    liveDataNotice: 'केवल कनेक्टेड सेवाओं द्वारा दिया गया डेटा दिखाया जाता है।', loadingWorkspace: 'आपका खेत कार्यक्षेत्र लोड हो रहा है…',
    loading: 'लोड हो रहा है…', retry: 'फिर कोशिश करें', refresh: 'रीफ़्रेश', close: 'बंद करें', save: 'सहेजें', saving: 'सहेज रहा है…',
    submit: 'जमा करें', analyze: 'छवि का विश्लेषण करें', send: 'भेजें', sending: 'भेज रहा है…', calculate: 'गणना करें', calculating: 'गणना हो रही है…',
    getAdvice: 'सलाह पाएँ', getRecommendations: 'सिफारिशें पाएँ', askCopilot: 'कोपायलट से पूछें', requestAccess: 'ब्राउज़र अलर्ट सक्षम करें',
    connectionIssue: 'इस सेवा से संपर्क नहीं हो सका।', notAvailable: 'उपलब्ध नहीं', noData: 'अभी कोई डेटा उपलब्ध नहीं है।',
    noRecords: 'अभी कोई सहेजा गया रिकॉर्ड उपलब्ध नहीं है।', serviceDataOnly: 'इस जगह पर केवल कनेक्टेड सेवा द्वारा दिया डेटा दिखता है; कोई उदाहरण मान नहीं।',
    navDashboard: 'डैशबोर्ड', navFarm: 'मेरा खेत', navWeather: 'मौसम और अलर्ट', navCrop: 'फसल और बीज सलाहकार', navHealth: 'फसल स्वास्थ्य',
    navIrrigation: 'सिंचाई', navYield: 'उपज पूर्वानुमान', navCalculator: 'खेत कैलकुलेटर', navPesticide: 'कीटनाशक कैलकुलेटर',
    navCopilot: 'AI कोपायलट', navHistory: 'इतिहास', navStatus: 'सिस्टम स्थिति',
    dashboardTitle: 'लाइव जानकारी पर आधारित खेत के निर्णय', dashboardSubtitle: 'अपनी खेत प्रोफ़ाइल, कनेक्टेड मौसम, अलर्ट और आज की योजना एक जगह देखें।',
    dashboardRefresh: 'डैशबोर्ड रीफ़्रेश करें', profile: 'खेत प्रोफ़ाइल', weather: 'मौसम', alerts: 'अलर्ट', todayPlan: 'आज की खेत योजना',
    actionsToday: 'उपलब्ध कार्रवाइयाँ', profileReady: 'प्रोफ़ाइल उपलब्ध है', profileMissing: 'अपनी प्रोफ़ाइल सेट करें',
    weatherUnavailable: 'मौसम डेटा अस्थायी रूप से अनुपलब्ध है।', planUnavailable: 'आज की खेत योजना अस्थायी रूप से अनुपलब्ध है।',
    noAlerts: 'कोई मौसम अलर्ट नहीं मिला।', setupFarm: 'खेत प्रोफ़ाइल सेट करें', viewWeather: 'मौसम देखें', viewAll: 'सभी देखें',
    farmTitle: 'आपकी खेत प्रोफ़ाइल', farmSubtitle: 'हर निर्णय सेवा द्वारा उपयोग की जाने वाली साझा जानकारी को अद्यतन रखें।',
    farmIntro: 'केवल वही जानकारी जमा करें जिसे कनेक्टेड निर्णय सेवाएँ उपयोग करें। खाली फ़ील्ड खाली रहते हैं; एग्रीसाथी खेत के विवरण नहीं गढ़ता।',
    farmerName: 'किसान का नाम', location: 'स्थान', latitude: 'अक्षांश', longitude: 'देशांतर', farmArea: 'खेत का क्षेत्रफल', soilType: 'मिट्टी का प्रकार',
    soilPh: 'मिट्टी pH', nitrogen: 'नाइट्रोजन (N)', phosphorus: 'फॉस्फोरस (P)', potassium: 'पोटैशियम (K)', currentCrop: 'वर्तमान फसल',
    cropVariety: 'फसल किस्म', plantingDate: 'रोपण तिथि', season: 'मौसम', waterSource: 'जल स्रोत', irrigationMethod: 'सिंचाई विधि',
    previousCrop: 'पिछली फसल', previousYield: 'पिछली उपज', preferredLanguage: 'पसंदीदा भाषा', saveProfile: 'खेत प्रोफ़ाइल सहेजें',
    profileSaved: 'खेत प्रोफ़ाइल सहेज दी गई।', profileLoadError: 'खेत प्रोफ़ाइल लोड नहीं हो सकी।', profileSaveError: 'खेत प्रोफ़ाइल सहेजी नहीं जा सकी।',
    optional: 'वैकल्पिक', required: 'आवश्यक', coordinatesHint: 'निर्देशांक मौसम सेवा को आपके खेत का स्थान उपयोग करने देते हैं।',
    nutrientsHint: 'जहाँ उपलब्ध हों वहाँ असली मिट्टी-परीक्षण मानों का उपयोग करें।', weatherTitle: 'लाइव मौसम और खेत अलर्ट',
    weatherSubtitle: 'आपकी खेत प्रोफ़ाइल में सहेजे निर्देशांकों के लिए मौसम अनुरोध किया जाता है।',
    weatherProfileNeeded: 'खेत मौसम माँगने से पहले खेत प्रोफ़ाइल में स्थान और निर्देशांक जोड़ें।', openFarmProfile: 'खेत प्रोफ़ाइल खोलें',
    dataSource: 'डेटा स्रोत', lastUpdated: 'अंतिम अद्यतन', timezone: 'समय क्षेत्र', currentConditions: 'वर्तमान स्थितियाँ', forecast: 'पूर्वानुमान',
    hourlyForecast: 'घंटेवार पूर्वानुमान', dailyForecast: 'दैनिक पूर्वानुमान', temperature: 'तापमान', feelsLike: 'अनुभव तापमान',
    humidity: 'नमी', rainProbability: 'बारिश की संभावना', rainfall: 'वर्षा', windSpeed: 'हवा की गति', windDirection: 'हवा की दिशा',
    uvIndex: 'UV सूचकांक', condition: 'स्थिति', date: 'तारीख', time: 'समय', high: 'अधिकतम', low: 'न्यूनतम',
    noForecast: 'मौसम सेवा ने कोई पूर्वानुमान नहीं दिया।', weatherLoadError: 'लाइव मौसम लोड नहीं हो सका।', alertsLoadError: 'मौसम अलर्ट लोड नहीं हो सके।',
    alertTime: 'अनुमानित समय', recommendedAction: 'सुझाई कार्रवाई', expectedCondition: 'अनुमानित स्थिति', requestNotifications: 'ब्राउज़र अलर्ट सक्षम करें',
    notificationGranted: 'ब्राउज़र अलर्ट अनुमति सक्षम है।', notificationDenied: 'ब्राउज़र अलर्ट अनुमति नहीं मिली।', notificationUnsupported: 'यह ब्राउज़र सूचना अनुमति का समर्थन नहीं करता।',
    notificationHint: 'अनुमति केवल ऐप द्वारा भेजे जाने पर इस ब्राउज़र को अलर्ट लेने देती है; यह अलर्ट बनाती नहीं है।',
    cropTitle: 'फसल और बीज सलाहकार', cropSubtitle: 'कनेक्टेड सिफारिश सेवाओं को खेत और मिट्टी के इनपुट भेजें।',
    cropRecommendation: 'फसल सिफारिश', seedAdvisor: 'बीज सलाहकार', cropFormHint: 'जहाँ संभव हो मापे हुए मानों का उपयोग करें। सेवा के जवाब के बाद ही सिफारिशें दिखती हैं।',
    seedFormHint: 'बीज की कीमत और उपलब्धता तभी दिखाई जाती है जब सत्यापित कैटलॉग सेवा उन्हें लौटाती है।', ph: 'pH', ambientTemperature: 'तापमान',
    waterAvailability: 'पानी की उपलब्धता', recommendCrops: 'फसलों की सिफारिश करें', recommendSeeds: 'बीज किस्में खोजें', cropResult: 'फसल सिफारिशें',
    seedResult: 'बीज सिफारिशें', whyRecommended: 'क्यों सिफारिश की गई', suitabilityScore: 'अनुकूलता स्कोर', modelProbability: 'मॉडल प्रायिकता (कैलिब्रेटेड विश्वास नहीं)', reportedConfidence: 'रिपोर्ट किया मॉडल विश्वास',
    price: 'कीमत', priceUnit: 'कीमत इकाई', priceUnavailable: 'कीमत उपलब्ध नहीं है। स्थानीय विक्रेता से सत्यापित करें।', source: 'स्रोत',
    duration: 'अवधि', region: 'क्षेत्र', seedRequirement: 'बीज आवश्यकता', expectedYield: 'अपेक्षित उपज',
    recommendationUnavailable: 'फसल सिफारिशें अभी अनुपलब्ध हैं।', seedUnavailable: 'सत्यापित बीज कैटलॉग अभी अनुपलब्ध है।',
    cropModelUnavailable: 'फसल सिफारिश मॉडल अभी अनुपलब्ध है।', seedCatalogUnavailable: 'सत्यापित बीज कैटलॉग अभी अनुपलब्ध है।',
    healthTitle: 'फसल स्वास्थ्य विश्लेषण', healthSubtitle: 'कनेक्टेड रोग मॉडल द्वारा विश्लेषण के लिए फसल की साफ छवि अपलोड करें।',
    healthIntro: 'छवि केवल तब भेजी जाती है जब आप विश्लेषण चुनते हैं। रोग सेवा के परिणाम के बिना निदान कभी नहीं दिखाया जाता।',
    chooseImage: 'फसल छवि चुनें', imageChosen: 'छवि विश्लेषण के लिए तैयार है।', imageRequired: 'विश्लेषण से पहले एक छवि चुनें।', imagePreview: 'चुनी गई छवि का पूर्वावलोकन',
    cropForImage: 'छवि में फसल', analyzeImage: 'छवि का विश्लेषण करें', analysisResult: 'विश्लेषण परिणाम',
    modelUnavailable: 'AI रोग मॉडल अभी अनुपलब्ध है।', lowConfidence: 'कम-विश्वास परिणाम। कृपया योग्य कृषि मार्गदर्शन से सत्यापित करें।',
    voiceExplanation: 'व्याख्या सुनें', stopSpeaking: 'बोलना बंद करें', speechUnsupported: 'इस ब्राउज़र में वॉइस आउटपुट उपलब्ध नहीं है।',
    diseaseLoadError: 'छवि का विश्लेषण नहीं हो सका।', diseaseName: 'परिणाम', probability: 'संभावना', symptoms: 'लक्षण', explanation: 'व्याख्या',
    organicManagement: 'जैविक प्रबंधन', ipm: 'एकीकृत कीट प्रबंधन', chemicalManagement: 'रासायनिक प्रबंधन', prevention: 'रोकथाम',
    irrigationTitle: 'सिंचाई सलाहकार', irrigationSubtitle: 'वर्तमान फसल स्थितियों और दी गई नमी जानकारी से सलाह माँगें।',
    irrigationHint: 'सलाहकार केवल आपके जमा मान और उपलब्ध कनेक्टेड मौसम जानकारी का आकलन कर सकता है।', cropStage: 'फसल अवस्था', soilMoisture: 'मिट्टी की नमी',
    rainForecast: 'बारिश पूर्वानुमान', irrigationResult: 'सिंचाई सलाह', irrigationUnavailable: 'सिंचाई सलाह अभी अनुपलब्ध है।',
    yieldTitle: 'उपज पूर्वानुमान', yieldSubtitle: 'कनेक्टेड अनुमान सेवा से उपज अनुमान माँगें।',
    yieldHint: 'अनुमान, सीमाएँ और विश्वास केवल तब दिखते हैं जब मॉडल सेवा उन्हें लौटाती है।', seedVariety: 'बीज किस्म',
    fertilizerInformation: 'उर्वरक जानकारी', requestYield: 'उपज पूर्वानुमान माँगें', yieldResult: 'उपज पूर्वानुमान परिणाम', yieldUnavailable: 'उपज पूर्वानुमान मॉडल अभी अनुपलब्ध है।',
    calculatorTitle: 'खेत कैलकुलेटर और क्या-हो-अगर परिदृश्य', calculatorSubtitle: 'उत्पादन, आय और लाभ की गणना के लिए अपनी लागत और धारणाएँ भेजें।',
    calculatorHint: 'किसी भी फ़ील्ड को बदलकर फिर गणना करें। परिणाम किसी तैयार उदाहरण से नहीं, गणना सेवा से आते हैं।',
    expectedYieldPerArea: 'प्रति एकड़ अपेक्षित उपज', sellingPrice: 'बिक्री मूल्य', seedCost: 'बीज लागत', fertilizerCost: 'उर्वरक लागत', pesticideCost: 'कीटनाशक लागत',
    labourCost: 'श्रम लागत', irrigationCost: 'सिंचाई लागत', otherCosts: 'अन्य लागत', calculateFarm: 'खेत परिणाम की गणना करें', calculatorResult: 'खेत गणना',
    calculationUnavailable: 'खेत गणना अभी अनुपलब्ध है।', pesticideTitle: 'कीटनाशक कैलकुलेटर', pesticideSubtitle: 'केवल आपके दर्ज सत्यापित उत्पाद-लेबल खुराक से गणना करें।',
    pesticideHint: 'अनुमानित खुराक न डालें। परिणाम को हमेशा उत्पाद लेबल और स्थानीय कृषि मार्गदर्शन से सत्यापित करें।',
    product: 'उत्पाद', activeIngredient: 'सक्रिय घटक', labelDosage: 'सत्यापित लेबल खुराक', dosageUnit: 'खुराक इकाई',
    waterVolumePerAcre: 'प्रति एकड़ पानी की मात्रा', tankCapacity: 'टैंक क्षमता', calculatePesticide: 'उत्पाद और पानी की गणना करें',
    pesticideResult: 'कीटनाशक गणना', labelWarning: 'प्रयोग से पहले उत्पाद लेबल से सत्यापित करें।', pesticideUnavailable: 'कीटनाशक गणना अभी अनुपलब्ध है।',
    copilotTitle: 'AI खेत कोपायलट', copilotSubtitle: 'खेत का प्रश्न पूछें। कनेक्टेड सहायक सहेजी प्रोफ़ाइल और उपलब्ध लाइव संदर्भ का उपयोग कर सकता है।',
    copilotHint: 'जवाब कॉन्फ़िगर AI सेवा द्वारा बनाए जाते हैं। सेवा अनुपलब्ध होने पर यह पृष्ठ सलाह गढ़ने के बजाय बताएगा।',
    messageLabel: 'आपका खेत प्रश्न', messagePlaceholder: 'अपनी फसल, मौसम, सिंचाई, लागत या खेत योजना के बारे में पूछें…',
    startVoiceInput: 'वॉइस इनपुट शुरू करें', stopVoiceInput: 'वॉइस इनपुट बंद करें', voiceInputUnsupported: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।',
    listening: 'सुना जा रहा है…', copilotUnavailable: 'AI कोपायलट अभी अनुपलब्ध है।', noConversation: 'बातचीत शुरू करने के लिए एक प्रश्न पूछें।',
    you: 'आप', copilot: 'एग्रीसाथी कोपायलट', listenResponse: 'जवाब सुनें',
    historyTitle: 'खेत इतिहास', historySubtitle: 'अपने खेत के लिए कनेक्टेड बैकएंड द्वारा सहेजे रिकॉर्ड देखें।',
    historyHint: 'केवल बैकएंड में सहेजे रिकॉर्ड यहाँ दिखाई देते हैं।', searchHistory: 'सहेजे रिकॉर्ड खोजें', clearSearch: 'खोज साफ़ करें',
    historyLoadError: 'खेत इतिहास लोड नहीं हो सका।', recordType: 'रिकॉर्ड प्रकार', createdAt: 'बनाया गया',
    statusTitle: 'सिस्टम स्थिति', statusSubtitle: 'कनेक्टेड बैकएंड सेवाओं द्वारा रिपोर्ट की गई वास्तविक स्थिति देखें।',
    statusHint: 'पृष्ठ सफलतापूर्वक लोड होना हर सेवा के स्वस्थ होने का प्रमाण नहीं है; नीचे के मान हेल्थ एंडपॉइंट से आते हैं।',
    healthLoadError: 'सिस्टम स्वास्थ्य लोड नहीं हो सका।', service: 'सेवा', status: 'स्थिति', details: 'विवरण', noHealthData: 'कोई स्वास्थ्य स्थिति नहीं मिली।',
    generalError: 'कुछ गलत हुआ। फिर कोशिश करें।', networkError: 'नेटवर्क कनेक्शन विफल हुआ। कनेक्शन जाँचें और फिर कोशिश करें।',
    requestFailed: 'अनुरोध पूरा नहीं हो सका।', serverResponse: 'सेवा जवाब', formFixErrors: 'हाइलाइट किए आवश्यक फ़ील्ड जाँचें और फिर कोशिश करें।',
    unknown: 'अज्ञात', yes: 'हाँ', no: 'नहीं', none: 'कोई नहीं', backToDashboard: 'डैशबोर्ड पर लौटें', resultPending: 'सेवा के जवाब के बाद आपका परिणाम यहाँ दिखेगा।',
    languageSavedDevice: 'भाषा प्राथमिकता इस डिवाइस पर सहेजी गई।', languageSyncFailed: 'भाषा यहाँ बदल गई, लेकिन खेत प्रोफ़ाइल में सहेजी नहीं जा सकी।',
    noImage: 'कोई छवि नहीं चुनी गई', removeImage: 'छवि हटाएँ', responseSources: 'स्रोत', actions: 'कार्रवाइयाँ', readOnlyField: 'लौटाया गया डेटा',
    processing: 'प्रसंस्करण हो रहा है…', requestInProgress: 'एक अनुरोध प्रगति पर है।', browserOffline: 'लगता है आप ऑफ़लाइन हैं।', browserOnline: 'कनेक्शन बहाल हुआ।',
    healthBackend: 'बैकएंड', healthDatabase: 'डेटाबेस', healthWeather: 'मौसम प्रदाता', healthAi: 'AI सेवा', healthMl: 'ML सेवा',
    navFertilizer: 'उर्वरक सलाह', navPest: 'कीट प्रबंधन', crop: 'फसल', growthStage: 'विकास अवस्था',
    fertilizerTitle: 'उर्वरक सलाहकार', fertilizerSubtitle: 'असत्यापित उर्वरक दर बनाए बिना दर्ज मिट्टी पोषक मानों की समीक्षा करें।',
    fertilizerHint: 'जहाँ उपलब्ध हो वहाँ मिट्टी परीक्षण के मान दर्ज करें। यह साधन केवल समीक्षा के लिए मान दिखाता है; उर्वरक खुराक नहीं देता।',
    requestFertilizerAdvice: 'पोषक विवरण देखें', fertilizerResult: 'उर्वरक सलाह', fertilizerUnavailable: 'उर्वरक सलाह अभी अनुपलब्ध है।',
    pestTitle: 'कीट प्रबंधन', pestSubtitle: 'रिपोर्ट की गई खेत समस्या के लिए सामान्य एकीकृत कीट प्रबंधन कदम लें।',
    pestHint: 'यह निदान या कीटनाशक लेबल की सिफारिश नहीं है। समस्या का निरीक्षण करें और किसी भी उपचार को स्थानीय रूप से सत्यापित करें।',
    problem: 'देखी गई कीट या रोग समस्या', requestPestGuidance: 'IPM मार्गदर्शन लें', pestResult: 'कीट प्रबंधन मार्गदर्शन', pestUnavailable: 'कीट प्रबंधन मार्गदर्शन अभी अनुपलब्ध है।',
    nutrientFindings: 'दर्ज पोषक मान', recordedValue: 'दर्ज मान', management: 'प्रबंधन', disclaimer: 'अस्वीकरण',
    scope: 'दायरा', recommendations: 'सिफारिशें', priority: 'प्राथमिकता', why: 'क्यों', how: 'कैसे', when: 'कब', pesticideNotice: 'कीटनाशक सूचना'
  };

  const translations = { en, te, hi };
  const state = {
    lang: getStoredLanguage(),
    activeView: routeFromHash(),
    profile: null,
    resources: {
      health: resource(), profile: resource(), weather: resource(), alerts: resource(), plan: resource(), history: resource()
    },
    copilotMessages: [],
    diseaseResult: null,
    voiceRecognition: null,
    imagePreviewUrl: null,
    isListening: false,
    rainSirenEnabled: safeGetStorage(RAIN_SIREN_STORAGE_KEY) === 'true',
    lastRainEventKey: safeGetStorage(RAIN_EVENT_STORAGE_KEY) || '',
    rainSirenAudio: null,
    rainSirenAudioUnavailable: false,
    rainMonitorId: null,
    initialized: false,
    currentLocationWeather: null,
currentLocationCoords: null,
currentLocationName: '',
currentLocationLoading: false,
currentLocationError: null,

locationSearchQuery: '',
locationSearchResults: [],
locationSearchLoading: false,
locationSearchError: '',
  };

  const NAV_ITEMS = [
    ['dashboard', '⌂', 'navDashboard'], ['farm', '⌑', 'navFarm'], ['weather', '☁', 'navWeather'],
    ['crop', '✦', 'navCrop'], ['health', '⌕', 'navHealth'], ['irrigation', '≈', 'navIrrigation'],
    ['fertilizer', '⌬', 'navFertilizer'], ['pest', '⚑', 'navPest'], ['yield', '↗', 'navYield'],
    ['calculator', '▣', 'navCalculator'], ['pesticide', '◌', 'navPesticide'],
    ['copilot', '✺', 'navCopilot'], ['history', '◷', 'navHistory'], ['status', '◉', 'navStatus']
  ];

  const FIELD_LABELS = {
    name: 'farmerName', farmerName: 'farmerName', location: 'location', latitude: 'latitude', longitude: 'longitude',
    farmArea: 'farmArea', area: 'farmArea', soilType: 'soilType', soil: 'soilType', soilPh: 'soilPh', ph: 'ph',
    nitrogen: 'nitrogen', phosphorus: 'phosphorus', potassium: 'potassium', currentCrop: 'currentCrop', crop: 'currentCrop',
    cropVariety: 'cropVariety', variety: 'cropVariety', plantingDate: 'plantingDate', season: 'season',
    waterSource: 'waterSource', irrigationMethod: 'irrigationMethod', previousCrop: 'previousCrop', previousYield: 'previousYield',
    temperature: 'temperature', feelsLike: 'feelsLike', humidity: 'humidity', rainProbability: 'rainProbability', rainfall: 'rainfall',
    windSpeed: 'windSpeed', windDirection: 'windDirection', uvIndex: 'uvIndex', condition: 'condition',
    source: 'source', lastUpdated: 'lastUpdated', createdAt: 'createdAt', expectedYield: 'expectedYield',
    seedRequirement: 'seedRequirement', price: 'price', priceUnit: 'priceUnit', duration: 'duration', region: 'region',
    organicManagement: 'organicManagement', ipm: 'ipm', chemicalManagement: 'chemicalManagement', prevention: 'prevention',
    symptoms: 'symptoms', explanation: 'explanation', probability: 'probability', confidence: 'reportedConfidence',
    suitabilityScore: 'suitabilityScore', recommendedAction: 'recommendedAction', expectedCondition: 'expectedCondition',
    status: 'status', details: 'details', actions: 'actions', message: 'serverResponse',
    growthStage: 'growthStage', recordedValue: 'recordedValue', management: 'management', disclaimer: 'disclaimer',
    scope: 'scope', recommendations: 'recommendations', priority: 'priority', why: 'why', how: 'how', when: 'when',
    pesticideNotice: 'pesticideNotice', problem: 'problem'
  };

  class ApiError extends Error {
    constructor(message, { status = 0, code = '', details = null } = {}) {
      super(message || 'Request failed');
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }

  const api = {
    health: () => request('/health'),
    profile: () => request('/profile'),
      translateDisease: (payload) =>
    request('/translate', {
      method: 'POST',
      data: payload
    }),

    updateProfile: (payload) => request('/profile', { method: 'PUT', data: payload }),
    updateProfileLanguage: (payload) => request('/profile', { method: 'PATCH', data: payload }),
    weather: () => request('/weather'),
    alerts: () => request('/alerts'),
    plan: () => request('/plan'),
    history: () => request('/history'),
    cropRecommendations: (payload) => request('/crop/recommendations', { method: 'POST', data: payload }),
    seedRecommendations: (payload) => request('/seed/recommendations', { method: 'POST', data: payload }),
    irrigationAdvice: (payload) => request('/irrigation/advice', { method: 'POST', data: payload }),
    fertilizerAdvice: (payload) => request('/fertilizer/advice', { method: 'POST', data: payload }),
    pestManagement: (payload) => request('/pest-management', { method: 'POST', data: payload }),
    yieldPredictions: (payload) => request('/yield/predictions', { method: 'POST', data: payload }),
    farmCalculation: (payload) => request('/calculations/farm', { method: 'POST', data: payload }),
    pesticideCalculation: (payload) => request('/pesticide/calculate', { method: 'POST', data: payload }),
    copilotMessage: (payload) => request('/copilot/messages', { method: 'POST', data: payload }),
    diseaseAnalyze: (payload) => request('/disease/analyze', { method: 'POST', data: payload })
  };

  function resource() {
    return { status: 'idle', data: null, error: null, promise: null };
  }

  function getStoredLanguage() {
    try {
      const saved = localStorage.getItem('agrisaathi-language');
      return ['en', 'te', 'hi'].includes(saved) ? saved : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function routeFromHash() {
    const candidate = window.location.hash.replace(/^#/, '').trim();
    return ALLOWED_VIEWS.has(candidate) ? candidate : 'dashboard';
  }

  function t(key) {
    return translations[state.lang]?.[key] || translations.en[key] || key;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function hasValue(value) {
    return value !== undefined && value !== null && value !== '';
  }

  function pick(object, keys) {
    if (!object || typeof object !== 'object') return undefined;
    for (const key of keys) {
      if (hasValue(object[key])) return object[key];
    }
    return undefined;
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    return Object.values(value);
  }

  function formatNumber(value, options = {}) {
    if (!hasValue(value)) return t('notAvailable');
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return escapeHtml(value);
    return new Intl.NumberFormat(LOCALES[state.lang], { maximumFractionDigits: 2, ...options }).format(numeric);
  }

  function formatDate(value, includeTime = true) {
    if (!hasValue(value)) return t('notAvailable');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
    return new Intl.DateTimeFormat(LOCALES[state.lang], includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' }).format(parsed);
  }

  function formatValue(value, field = '') {
    if (!hasValue(value)) return t('notAvailable');
    if (typeof value === 'boolean') return value ? t('yes') : t('no');
    if (Array.isArray(value)) {
      if (!value.length) return t('none');
      return value.map((item) => typeof item === 'object' ? JSON.stringify(item) : item).map(escapeHtml).join(', ');
    }
    if (typeof value === 'object') return escapeHtml(JSON.stringify(value));
    if (/date|time|updated|created/i.test(field) && !Number.isNaN(new Date(value).getTime())) return formatDate(value, !/date$/i.test(field));
    return escapeHtml(value);
  }

  function friendlyField(key) {
    if (FIELD_LABELS[key]) return t(FIELD_LABELS[key]);
    return escapeHtml(String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, (char) => char.toUpperCase()));
  }

  async function request(path, { method = 'GET', data, formData, signal } = {}) {
    const options = { method, headers: { Accept: 'application/json' }, signal };
    if (formData) {
      options.body = formData;
    } else if (data !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    let response;
    try {
      response = await fetch(`${API_ROOT}${path}`, options);
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new ApiError(t('networkError'), { code: 'NETWORK_ERROR' });
    }

    const raw = await response.text();
    let body = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch (_) {
        body = null;
      }
    }

    if (!response.ok || body?.ok === false) {
      const error = body?.error || {};
      throw new ApiError(error.message || body?.message || `${t('requestFailed')} (${response.status})`, {
        status: response.status,
        code: error.code || body?.code || '',
        details: error.details || body?.details || null
      });
    }

    if (body && Object.prototype.hasOwnProperty.call(body, 'ok')) return body.data;
    if (body !== null) return body;
    if (response.status === 204) return null;
    throw new ApiError(t('requestFailed'), { status: response.status, code: 'INVALID_RESPONSE' });
  }

  function errorMessage(error, fallbackKey = 'requestFailed') {
    const codeMessages = {
      CROP_MODEL_UNAVAILABLE: 'cropModelUnavailable',
      DISEASE_MODEL_UNAVAILABLE: 'modelUnavailable',
      AI_UNAVAILABLE: 'copilotUnavailable',
      SEED_CATALOG_UNAVAILABLE: 'seedCatalogUnavailable',
      YIELD_MODEL_UNAVAILABLE: 'yieldUnavailable'
    };
    const localized = codeMessages[error?.code] ? t(codeMessages[error.code]) : null;
    const serverMessage = error?.message && error.message !== t('networkError') ? error.message : '';
    if (localized && serverMessage && serverMessage !== localized) return `${localized} ${escapeHtml(serverMessage)}`;
    return localized || escapeHtml(serverMessage) || t(fallbackKey);
  }

  function updateStaticText() {
    document.documentElement.lang = state.lang;
    document.title = `${t('appName')} — ${t(`nav${capitalize(state.activeView)}`) || t('appName')}`;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
    });
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) languageSwitcher.value = state.lang;
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }

  function renderNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav) return;
    nav.innerHTML = NAV_ITEMS.map(([id, icon, label]) => `
      <button class="nav-item${state.activeView === id ? ' is-active' : ''}" type="button" data-route="${id}"
        ${state.activeView === id ? 'aria-current="page"' : ''}>
        <span class="nav-icon" aria-hidden="true">${icon}</span><span>${t(label)}</span>
      </button>`).join('');
  }

  function updateFarmSummary() {
    const target = document.getElementById('farm-summary-name');
    if (!target) return;
    const profile = state.profile;
    target.textContent = pick(profile, ['farmerName', 'name', 'location', 'farmName']) || t('farmNotSet');
  }

  function updateConnectionIndicator() {
    const resourceState = state.resources.health;
    const indicator = document.getElementById('connection-indicator');
    const label = document.getElementById('connection-label');
    if (!indicator || !label) return;
    indicator.classList.remove('is-ready', 'is-error', 'is-loading');
    if (resourceState.status === 'error') {
      indicator.classList.add('is-error');
      label.textContent = t('systemUnavailable');
    } else if (resourceState.status === 'ready') {
      indicator.classList.add('is-ready');
      label.textContent = t('systemStatusLoaded');
    } else {
      indicator.classList.add('is-loading');
      label.textContent = t('checkingSystem');
    }
  }

  function pageHeading(titleKey, subtitleKey, actionMarkup = '') {
    return `<header class="page-heading">
      <div><p class="eyebrow">${t('appName')}</p><h1>${t(titleKey)}</h1><p>${t(subtitleKey)}</p></div>
      ${actionMarkup ? `<div class="page-heading-actions">${actionMarkup}</div>` : ''}
    </header>`;
  }

  function primaryButton({ id = '', action = '', label, type = 'button', icon = '', disabled = false, className = '' } = {}) {
    return `<button class="button button-primary ${className}" ${id ? `id="${id}"` : ''} ${action ? `data-action="${action}"` : ''}
      type="${type}" ${disabled ? 'disabled' : ''}><span>${icon ? `<span aria-hidden="true">${icon}</span>` : ''}${t(label)}</span><span class="button-spinner spinner" aria-hidden="true"></span></button>`;
  }

  function secondaryButton({ id = '', action = '', label, type = 'button', icon = '', disabled = false, className = '' } = {}) {
    return `<button class="button button-secondary ${className}" ${id ? `id="${id}"` : ''} ${action ? `data-action="${action}"` : ''}
      type="${type}" ${disabled ? 'disabled' : ''}>${icon ? `<span aria-hidden="true">${icon}</span>` : ''}<span>${t(label)}</span><span class="button-spinner spinner" aria-hidden="true"></span></button>`;
  }

  function loadingBlock(labelKey = 'loading') {
    return `<div class="loading-block" role="status"><span class="spinner" aria-hidden="true"></span><span>${t(labelKey)}</span></div>`;
  }

  function emptyBlock(messageKey = 'noData', extra = '') {
    return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">◇</span><p>${t(messageKey)}</p>${extra}</div>`;
  }

  function errorBlock(error, fallbackKey = 'requestFailed', retryAction = '') {
    return `<div class="notice notice-error" role="alert"><span aria-hidden="true">!</span><div><strong>${t('requestFailed')}</strong><p>${errorMessage(error, fallbackKey)}</p>${retryAction ? secondaryButton({ action: retryAction, label: 'retry', className: 'compact-button' }) : ''}</div></div>`;
  }

  function card(title, content, { className = '', action = '' } = {}) {
    return `<section class="panel ${className}">${title ? `<div class="panel-header"><h2>${title}</h2>${action}</div>` : ''}<div class="panel-content">${content}</div></section>`;
  }

  function statCard(label, value, detail = '', tone = '') {
    return `<section class="stat-card ${tone}"><p>${label}</p><strong>${value}</strong>${detail ? `<span>${detail}</span>` : ''}</section>`;
  }

  function resourceContent(resourceKey, renderData, { errorKey = 'requestFailed', retryAction = '' } = {}) {
    const item = state.resources[resourceKey];
    if (item.status === 'loading' || item.status === 'idle') return loadingBlock();
    if (item.status === 'error') return errorBlock(item.error, errorKey, retryAction);
    return renderData(item.data);
  }

  function dashboardTemplate() {
    const profile = state.profile;
    const weather = state.resources.weather.data;
    const plan = state.resources.plan.data;
    const alerts = state.resources.alerts.data;
    const current = weather?.current || weather?.currentWeather || null;
    const actionCount = planItems(plan).length;
    const currentCondition = pick(current, ['condition', 'summary', 'weatherDescription', 'description']);
    return `${pageHeading('dashboardTitle', 'dashboardSubtitle', primaryButton({ action: 'refresh-dashboard', label: 'dashboardRefresh', icon: '↻' }))}
      <div class="stat-grid">
        ${statCard(t('profile'), profile ? t('profileReady') : t('profileMissing'), profile ? escapeHtml(pick(profile, ['location', 'currentCrop']) || t('notAvailable')) : '')}
        ${statCard(t('weather'), currentCondition ? escapeHtml(currentCondition) : t('notAvailable'), weather?.lastUpdated ? `${t('lastUpdated')}: ${formatDate(weather.lastUpdated)}` : '')}
        ${statCard(t('todayPlan'), state.resources.plan.status === 'ready' ? formatNumber(actionCount) : t('notAvailable'), t('actionsToday'))}
      </div>
      <div class="dashboard-grid">
        ${card(t('todayPlan'), resourceContent('plan', renderPlan, { errorKey: 'planUnavailable', retryAction: 'refresh-dashboard' }), { className: 'plan-panel', action: `<button class="text-button" type="button" data-route="weather">${t('viewWeather')} <span aria-hidden="true">→</span></button>` })}
        ${card(t('weather'), resourceContent('weather', renderWeatherSnapshot, { errorKey: 'weatherLoadError', retryAction: 'refresh-dashboard' }), { className: 'weather-panel', action: `<button class="text-button" type="button" data-route="weather">${t('viewAll')} <span aria-hidden="true">→</span></button>` })}
        ${card(t('alerts'), resourceContent('alerts', renderAlerts, { errorKey: 'alertsLoadError', retryAction: 'refresh-dashboard' }), { className: 'alerts-panel' })}
        ${card(t('profile'), renderProfileSnapshot(), { className: 'profile-panel' })}
      </div>`;
  }

  function renderPlan(data) {
    const items = planItems(data);
    if (!items.length) return emptyBlock('planUnavailable');
    return `<ol class="action-list">${items.map((item) => {
      const title = typeof item === 'string' ? item : pick(item, ['title', 'action', 'message', 'recommendation', 'text']);
      const reason = typeof item === 'object' ? pick(item, ['reason', 'why', 'description', 'detail']) : '';
      const timing = typeof item === 'object' ? pick(item, ['time', 'when', 'priority']) : '';
      return `<li><span class="action-marker" aria-hidden="true">✓</span><div><strong>${escapeHtml(title || t('notAvailable'))}</strong>${reason ? `<p>${escapeHtml(reason)}</p>` : ''}${timing ? `<small>${escapeHtml(timing)}</small>` : ''}</div></li>`;
    }).join('')}</ol>`;
  }

  function planItems(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return pick(data, ['actions', 'plan', 'items', 'recommendations']) || [];
  }

  function renderWeatherSnapshot(weather) {
    const current = weather?.current || weather?.currentWeather || weather;
    if (!current || typeof current !== 'object') return emptyBlock('weatherUnavailable');
    const temp = pick(current, ['temperature', 'temperatureC', 'temp']);
    const condition = pick(current, ['condition', 'summary', 'weatherDescription', 'description']);
    const humidity = pick(current, ['humidity', 'relativeHumidity']);
    return `<div class="weather-snapshot"><div class="weather-main"><span class="weather-glyph" aria-hidden="true">☀</span><div><strong>${hasValue(temp) ? `${formatNumber(temp)}°` : t('notAvailable')}</strong><p>${escapeHtml(condition || t('notAvailable'))}</p></div></div>
      <dl class="mini-data"><div><dt>${t('humidity')}</dt><dd>${hasValue(humidity) ? `${formatNumber(humidity)}%` : t('notAvailable')}</dd></div><div><dt>${t('rainProbability')}</dt><dd>${percentage(pick(current, ['rainProbability', 'precipitationProbability']))}</dd></div></dl>
      ${weather?.lastUpdated ? `<p class="data-caption">${t('lastUpdated')}: ${formatDate(weather.lastUpdated)}</p>` : ''}</div>`;
  }

  function percentage(value) {
    return hasValue(value) ? `${formatNumber(value)}%` : t('notAvailable');
  }

  function renderAlerts(data) {
    const alerts = alertItems(data);
    if (!alerts.length) return emptyBlock('noAlerts');
    return `<ul class="alert-list">${alerts.slice(0, 4).map((alert) => {
      const title = typeof alert === 'string' ? alert : pick(alert, ['title', 'alert', 'message', 'type', 'name']);
      const at = typeof alert === 'object' ? pick(alert, ['time', 'expectedTime', 'start', 'date']) : '';
      return `<li><span class="alert-symbol" aria-hidden="true">!</span><div><strong>${escapeHtml(title || t('notAvailable'))}</strong>${at ? `<p>${formatDate(at)}</p>` : ''}</div></li>`;
    }).join('')}</ul>`;
  }

  function alertItems(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return pick(data, ['alerts', 'items', 'records']) || [];
  }

  function renderProfileSnapshot() {
    const profile = state.profile;
    if (!profile) return emptyBlock('profileMissing', primaryButton({ action: 'go-farm', label: 'setupFarm', className: 'compact-button' }));
    const entries = [
      ['location', pick(profile, ['location'])], ['farmArea', pick(profile, ['farmArea', 'area'])],
      ['currentCrop', pick(profile, ['currentCrop', 'crop'])], ['soilType', pick(profile, ['soilType', 'soil'])]
    ].filter(([, value]) => hasValue(value));
    if (!entries.length) return emptyBlock('profileMissing', primaryButton({ action: 'go-farm', label: 'setupFarm', className: 'compact-button' }));
    return `<dl class="data-list compact">${entries.map(([key, value]) => `<div><dt>${friendlyField(key)}</dt><dd>${formatValue(value, key)}</dd></div>`).join('')}</dl><button type="button" class="text-button" data-route="farm">${t('navFarm')} <span aria-hidden="true">→</span></button>`;
  }

  function farmTemplate() {
    const profile = state.profile || {};
    const error = state.resources.profile.status === 'error' ? errorBlock(state.resources.profile.error, 'profileLoadError', 'reload-profile') : '';
    return `${pageHeading('farmTitle', 'farmSubtitle', secondaryButton({ action: 'reload-profile', label: 'refresh', icon: '↻' }))}
      ${error}
      <section class="form-intro"><span aria-hidden="true">✦</span><p>${t('farmIntro')}</p></section>
      <form class="form-card" id="farm-form" novalidate>
        <fieldset><legend>${t('profile')}</legend>
          <div class="form-grid two-col">
            ${inputField('farmerName', profileValue(profile, 'farmerName', 'name'), { required: true, autocomplete: 'name' })}
            ${inputField('location', profileValue(profile, 'location'), { required: true, autocomplete: 'address-level2' })}
            ${inputField('latitude', profileValue(profile, 'latitude'), { type: 'number', step: 'any', inputmode: 'decimal', required: true })}
            ${inputField('longitude', profileValue(profile, 'longitude'), { type: 'number', step: 'any', inputmode: 'decimal', required: true })}
          </div>
          <p class="field-hint">${t('coordinatesHint')}</p>
        </fieldset>
        <fieldset><legend>${t('soilType')}</legend>
          <div class="form-grid four-col">
            ${inputField('farmArea', profileValue(profile, 'farmArea', 'area'), { type: 'number', min: '0.001', step: 'any', inputmode: 'decimal', required: true })}
            ${inputField('soilType', profileValue(profile, 'soilType', 'soil'))}
            ${inputField('soilPh', profileValue(profile, 'soilPh', 'ph'), { type: 'number', min: '0', max: '14', step: '0.01', inputmode: 'decimal' })}
            ${inputField('waterSource', profileValue(profile, 'waterSource'))}
          </div>
          <div class="form-grid three-col">
            ${inputField('nitrogen', profileValue(profile, 'nitrogen', 'N'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
            ${inputField('phosphorus', profileValue(profile, 'phosphorus', 'P'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
            ${inputField('potassium', profileValue(profile, 'potassium', 'K'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
          </div>
          <p class="field-hint">${t('nutrientsHint')}</p>
        </fieldset>
        <fieldset><legend>${t('currentCrop')}</legend>
          <div class="form-grid three-col">
            ${inputField('currentCrop', profileValue(profile, 'currentCrop', 'crop'))}
            ${inputField('cropVariety', profileValue(profile, 'cropVariety', 'variety'))}
            ${inputField('plantingDate', profileValue(profile, 'plantingDate'), { type: 'date' })}
            ${inputField('season', profileValue(profile, 'season'))}
            ${inputField('irrigationMethod', profileValue(profile, 'irrigationMethod'))}
            ${inputField('previousCrop', profileValue(profile, 'previousCrop'))}
            ${inputField('previousYield', profileValue(profile, 'previousYield'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
            ${languageField(profileValue(profile, 'preferredLanguage') || state.lang)}
          </div>
        </fieldset>
        <div class="form-footer"><div id="farm-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'farm-save', label: 'saveProfile', type: 'submit', icon: '✓' })}</div>
      </form>`;
  }

  function profileValue(profile, ...keys) {
    return pick(profile, keys) ?? '';
  }

  function inputField(key, value = '', options = {}) {
    const id = options.id || `field-${key}`;
    const type = options.type || 'text';
    const required = options.required ? 'required aria-required="true"' : '';
    const optional = options.required ? `<span class="required-indicator">${t('required')}</span>` : `<span class="optional-indicator">${t('optional')}</span>`;
    const attrs = [
      `id="${id}"`, `name="${key}"`, `type="${type}"`, `value="${escapeAttribute(value)}"`, required,
      options.min !== undefined ? `min="${escapeAttribute(options.min)}"` : '', options.max !== undefined ? `max="${escapeAttribute(options.max)}"` : '',
      options.step ? `step="${escapeAttribute(options.step)}"` : '', options.inputmode ? `inputmode="${options.inputmode}"` : '',
      options.autocomplete ? `autocomplete="${options.autocomplete}"` : '', options.placeholder ? `placeholder="${escapeAttribute(options.placeholder)}"` : ''
    ].filter(Boolean).join(' ');
    return `<div class="field"><label for="${id}">${t(key)} ${optional}</label><input ${attrs}></div>`;
  }

  function textareaField(key, value = '', options = {}) {
    const id = options.id || `field-${key}`;
    return `<div class="field ${options.className || ''}"><label for="${id}">${t(key)}${options.required ? ` <span class="required-indicator">${t('required')}</span>` : ''}</label><textarea id="${id}" name="${key}" ${options.required ? 'required aria-required="true"' : ''} ${options.rows ? `rows="${options.rows}"` : ''} ${options.placeholder ? `placeholder="${escapeAttribute(options.placeholder)}"` : ''}>${escapeHtml(value)}</textarea></div>`;
  }

  function languageField(value) {
    return `<div class="field"><label for="field-preferredLanguage">${t('preferredLanguage')} <span class="optional-indicator">${t('optional')}</span></label><select id="field-preferredLanguage" name="preferredLanguage"><option value="en" ${value === 'en' ? 'selected' : ''}>English</option><option value="te" ${value === 'te' ? 'selected' : ''}>తెలుగు</option><option value="hi" ${value === 'hi' ? 'selected' : ''}>हिन्दी</option></select></div>`;
  }
function weatherTemplate() {
  const profileHasCoordinates =
    hasValue(pick(state.profile, ['latitude'])) &&
    hasValue(pick(state.profile, ['longitude']));

  return `${pageHeading(
    'weatherTitle',
    'weatherSubtitle',
    secondaryButton({
      action: 'refresh-weather',
      label: 'refresh',
      icon: '↻'
    })
  )}

  ${!profileHasCoordinates
    ? `<div class="notice notice-warning">
        <span aria-hidden="true">!</span>
        <div>
          <strong>${t('weatherProfileNeeded')}</strong>
          ${primaryButton({
            action: 'go-farm',
            label: 'openFarmProfile',
            className: 'compact-button'
          })}
        </div>
      </div>`
    : ''}

  

    

    <div class="panel-content">
      <p>
        Check weather at your current location or search for any place.
        Your saved farm location will not be changed.
      </p>

      <button
        type="button"
        class="button button-primary"
        data-action="check-current-location"
        ${state.currentLocationLoading ? 'disabled' : ''}
      >
        📍 ${
          state.currentLocationLoading
            ? 'Checking current location...'
            : 'Check My Current Location'
        }
      </button>

      
    <form
      id="current-location-search-form"
      class="location-search-form"
    >
      <label for="current-location-search">
        🔎 Search a location
      </label>

      <div class="location-search-row">
        <input
          id="current-location-search"
          name="location"
          type="search"
          value="${escapeAttribute(state.locationSearchQuery)}"
          placeholder="e.g. Warangal, Hyderabad, Vijayawada"
          autocomplete="off"
        />

       <button
    type="button"
    class="button button-secondary"
    data-action="search-location"
    ${state.locationSearchLoading ? 'disabled' : ''}
>
          ${state.locationSearchLoading ? 'disabled' : ''}
        >
          ${
            state.locationSearchLoading
              ? 'Searching...'
              : 'Search'
          }
        </button>
      </div>
    </form>

    ${
      state.locationSearchError
        ? `<div class="notice notice-warning">
            ${escapeHtml(state.locationSearchError)}
           </div>`
        : ''
    }

    ${renderLocationSearchResults()}

    ${
      state.currentLocationError
        ? `<div class="notice notice-warning">
            ${escapeHtml(state.currentLocationError)}
           </div>`
        : ''
    }

    ${renderCurrentLocationWeather(
      state.currentLocationWeather,
      state.currentLocationCoords,
      state.currentLocationName
    )}
  </div>
</section>
  <div class="weather-metadata">
    ${renderWeatherMetadata(state.resources.weather.data)}
  </div>

  <div class="weather-page-grid">
    ${card(
      t('currentConditions'),
      
       state.currentLocationWeather
  ? renderCurrentLocationWeather(
      state.currentLocationWeather,
      state.currentLocationCoords,
      state.currentLocationName
    )
  : `
      <div class="empty-state">
        <h3>📍 Select a location</h3>
        <p>
          Search for a location or use
          <strong>Check My Current Location</strong>
          to view real weather data.
        </p>
      </div>
    `,
      { className: 'current-weather-panel' }
    )}

    ${card(
      t('alerts'),
      state.currentLocationWeather
  ? renderHourlyForecast(state.currentLocationWeather)
  : `
      <div class="empty-state">
        <p>📍 Select a location to view the hourly forecast.</p>
      </div>
    `,
      { className: 'alert-panel' }
    )}
  </div>

  ${card(
    t('hourlyForecast'),
   state.currentLocationWeather
  ? renderHourlyForecast(state.currentLocationWeather)
  : `
      <div class="empty-state">
        <p>📍 Select a location to view the hourly forecast.</p>
      </div>
    `,
    { className: 'forecast-panel' }
  )}

  ${card(
    t('dailyForecast'),
    state.currentLocationWeather
  ? renderDailyForecast(state.currentLocationWeather)
  : `
      <div class="empty-state">
        <p>📍 Select a location to view the daily forecast.</p>
      </div>
    `,
    { className: 'forecast-panel' }
  )}

  <section class="notification-panel">
    <div>
      <h2>${t('requestNotifications')}</h2>
      <p>${t('notificationHint')}</p>
    </div>

    ${secondaryButton({
      action: 'request-notifications',
      label: 'requestNotifications'
    })}
  </section>`;
}

  function renderWeatherMetadata(weather) {
  if (!weather || typeof weather !== 'object') return '';

  const location = weather.location || {};

  const coordinates =
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude))
      ? `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`
      : null;

  const rows = [
    [t('dataSource'), weather.source],
    [
      t('lastUpdated'),
      weather.lastUpdated ? formatDate(weather.lastUpdated) : null
    ],
    [t('timezone'), weather.timezone],
    [t('farmCoordinates'), coordinates]
  ].filter(([, value]) => hasValue(value));

  if (!rows.length) return '';

  return `
    <dl class="metadata-list">
      ${rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(String(value))}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}
function renderLocationSearchResults() {
  if (
    !Array.isArray(state.locationSearchResults) ||
    !state.locationSearchResults.length
  ) {
    return '';
  }

  return `
    <div class="location-search-results">
      ${state.locationSearchResults.map((location, index) => `
        <button
          type="button"
          class="location-result"
          data-action="select-location"
          data-location-index="${index}"
        >
          <strong>${escapeHtml(location.name || '')}</strong>

          <span>
            ${escapeHtml([
              location.admin1,
              location.admin2,
              location.country
            ].filter(Boolean).join(', '))}
          </span>

          <small>
            ${Number(location.latitude).toFixed(4)},
            ${Number(location.longitude).toFixed(4)}
          </small>
        </button>
      `).join('')}
    </div>
  `;
}
function getWeatherCondition(weatherCode) {
  const code = Number(weatherCode);

  if (code === 0) {
    return { icon: '☀️', label: 'Sunny' };
  }

  if ([1, 2].includes(code)) {
    return { icon: '⛅', label: 'Partly cloudy' };
  }

  if (code === 3) {
    return { icon: '☁️', label: 'Cloudy' };
  }

  if ([45, 48].includes(code)) {
    return { icon: '🌫️', label: 'Foggy' };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { icon: '🌦️', label: 'Drizzle' };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { icon: '🌧️', label: 'Rain' };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { icon: '🌨️', label: 'Snow' };
  }

  if ([95, 96, 99].includes(code)) {
    return { icon: '⛈️', label: 'Thunderstorm' };
  }

  return { icon: '🌤️', label: 'Weather unavailable' };
}

function renderCurrentLocationWeather(
  weather,
  coords,
  locationName = ''
) {
  if (!weather || typeof weather !== 'object') {
    return '';
  }

  const current = weather.current || {};
  const condition = getWeatherCondition(current.weather_code);
  const hourly = weather.hourly || {};

  const precipitationProbability =
  Array.isArray(hourly.precipitation_probability)
    ? hourly.precipitation_probability[0]
    : null;

const nextRainIndex =
  Array.isArray(hourly.time) &&
  Array.isArray(hourly.precipitation_probability) &&
  Array.isArray(hourly.precipitation)
    ? hourly.time.findIndex((time, index) => {
        if (index === 0) return false;

        const probability =
          Number(hourly.precipitation_probability[index]);

        const precipitation =
          Number(hourly.precipitation[index]);

        return (
          Number.isFinite(probability) &&
          Number.isFinite(precipitation) &&
          probability >= 70 &&
          precipitation >= 1
        );
      })
    : -1;

const nextRain =
  nextRainIndex >= 0
    ? {
        time: hourly.time[nextRainIndex],
        probability:
          hourly.precipitation_probability[nextRainIndex],
        precipitation:
          hourly.precipitation[nextRainIndex]
      }
    : null;

  return `
    <div class="current-location-result">

      <div class="result-header">
        <div>
          <h3>
            📍 ${escapeHtml(locationName || 'Selected location')}
          </h3>
          <p class="weather-condition">
  ${condition.icon} <strong>${escapeHtml(condition.label)}</strong>
</p>

          <p>
   ${
  nextRain
    ? `
      <div class="next-rain-info">
        <strong>🌧️ Next expected rain</strong>

        <p>
          ${formatDate(nextRain.time)}
        </p>

        <p>
          Probability:
          <strong>${formatNumber(nextRain.probability, 0)}%</strong>
        </p>

        <p>
          Expected rainfall:
          <strong>${formatNumber(nextRain.precipitation)} mm</strong>
        </p>
      </div>
    `
    : `
      <div class="next-rain-info">
        <strong>☀️ No significant rain expected</strong>

        <p>
          No rain meeting the alert threshold was found
          in the available forecast.
        </p>

        <p>
          Current condition:
          <strong>Sunny</strong>
        </p>
      </div>
    `
}
          </p>
        </div>
      </div>

     <div class="weather-metrics">

  <div class="weather-metric">
    <span>🌡️</span>
    <div>
      <small>Temperature</small>
      <strong>
        ${
          hasValue(current.temperature_2m)
            ? `${formatNumber(current.temperature_2m)} °C`
            : '—'
        }
      </strong>
    </div>
  </div>

  <div class="weather-metric">
    <span>🌡️</span>
    <div>
      <small>Feels like</small>
      <strong>
        ${
          hasValue(current.apparent_temperature)
            ? `${formatNumber(current.apparent_temperature)} °C`
            : '—'
        }
      </strong>
    </div>
  </div>

  <div class="weather-metric">
    <span>💧</span>
    <div>
      <small>Humidity</small>
      <strong>
        ${
          hasValue(current.relative_humidity_2m)
            ? `${formatNumber(current.relative_humidity_2m, 0)}%`
            : '—'
        }
      </strong>
    </div>
  </div>

  <div class="weather-metric">
    <span>🌧️</span>
    <div>
      <small>Rain probability</small>
      <strong>
        ${
          hasValue(precipitationProbability)
            ? `${formatNumber(precipitationProbability, 0)}%`
            : '—'
        }
      </strong>
    </div>
  </div>

  <div class="weather-metric">
    <span>💦</span>
    <div>
      <small>Rainfall</small>
      <strong>
        ${
          hasValue(current.precipitation)
            ? `${formatNumber(current.precipitation)} mm`
            : '—'
        }
      </strong>
    </div>
  </div>

  <div class="weather-metric">
    <span>💨</span>
    <div>
      <small>Wind speed</small>
      <strong>
        ${
          hasValue(current.wind_speed_10m)
            ? `${formatNumber(current.wind_speed_10m)} km/h`
            : '—'
        }
      </strong>
    </div>
  </div>

</div>
      <p class="data-caption">
        Source: Open-Meteo ·
        This temporary location does not change your farm profile.
      </p>

    </div>
  `;
}

  function renderDetailedWeather(weather) {
  const current = weather?.current || weather?.currentWeather;

  if (!current || typeof current !== 'object') {
    return emptyBlock('weatherUnavailable');
  }

  const metrics = [
    ['temperature', pick(current, ['temperature', 'temperatureC', 'temp']), '°'],
    ['feelsLike', pick(current, ['feelsLike', 'apparentTemperature']), '°'],
    ['humidity', pick(current, ['humidity', 'relativeHumidity']), '%'],
    ['rainProbability', pick(current, ['rainProbability', 'precipitationProbability']), '%'],
    ['rainfall', pick(current, ['rainfall', 'precipitation']), ''],
    ['windSpeed', pick(current, ['windSpeed', 'windspeed']), ''],
    ['windDirection', pick(current, ['windDirection', 'winddirection']), ''],
    ['uvIndex', pick(current, ['uvIndex', 'uv']), '']
  ];

  const condition = pick(current, [
    'condition',
    'summary',
    'weatherDescription',
    'description'
  ]);

  // Real next-rain information from the backend
  const nextRain = weather?.nextRain;

  // Show warning only when meaningful rain is within 60 minutes
  const rainWarning =
    nextRain &&
    Number.isFinite(Number(nextRain.minutesUntilRain)) &&
    Number(nextRain.minutesUntilRain) <= 60
      ? `
        <div class="rain-warning">
          <strong>🌧 Rain Alert</strong>

          <p>
            Rain expected in approximately 1 hour.
          </p>

          <p>
            Probability: ${percentage(nextRain.rainProbability)}
            ${
              hasValue(nextRain.precipitation)
                ? ` · Expected rainfall: ${formatNumber(nextRain.precipitation)} mm`
                : ''
            }
          </p>
        </div>
      `
      : '';

  return `
    ${rainWarning}

    <div class="detailed-weather">
      <div class="condition-banner">
        <span aria-hidden="true">☀</span>

        <div>
          <p>${t('condition')}</p>
          <strong>
            ${escapeHtml(condition || t('notAvailable'))}
          </strong>
        </div>
      </div>

      <dl class="metric-grid">
        ${metrics.map(([key, value, unit]) => `
          <div>
            <dt>${t(key)}</dt>
            <dd>
              ${
                hasValue(value)
                  ? `${formatNumber(value)}${unit}`
                  : t('notAvailable')
              }
            </dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `;
}
  function renderHourlyForecast(weather) {
  const hourly = weather?.hourly;

  if (
    !hourly ||
    !Array.isArray(hourly.time) ||
    !hourly.time.length
  ) {
    return emptyBlock('noForecast');
  }

  return `
    <div class="forecast-scroll">
      <div class="hourly-list">
        ${hourly.time.slice(0, 24).map((time, index) => {
          const temperature =
            hourly.temperature_2m?.[index];

          const rainProbability =
            hourly.precipitation_probability?.[index];

          const precipitation =
            hourly.precipitation?.[index];

          return `
            <article>
              <time>${formatDate(time)}</time>

              <strong>
                ${
                  Number.isFinite(Number(temperature))
                    ? `${formatNumber(temperature)}°C`
                    : t('notAvailable')
                }
              </strong>

              <span>
                Rain probability:
                ${
                  Number.isFinite(Number(rainProbability))
                    ? `${formatNumber(rainProbability)}%`
                    : t('notAvailable')
                }
              </span>

              <span>
                Rainfall:
                ${
                  Number.isFinite(Number(precipitation))
                    ? `${formatNumber(precipitation)} mm`
                    : t('notAvailable')
                }
              </span>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

  function renderDailyForecast(weather) {
  const daily = weather?.daily;

  if (
    !daily ||
    !Array.isArray(daily.time) ||
    !daily.time.length
  ) {
    return emptyBlock('noForecast');
  }

  return `
    <div class="forecast-scroll">
      <div class="daily-list">
        ${daily.time.slice(0, 7).map((date, index) => {
          const high =
            daily.temperature_2m_max?.[index];

          const low =
            daily.temperature_2m_min?.[index];

          const rainProbability =
            daily.precipitation_probability_max?.[index];

          const rainfall =
            daily.precipitation_sum?.[index];

          return `
            <article>
              <time>${formatDate(date, false)}</time>

              <strong>
                High:
                ${
                  Number.isFinite(Number(high))
                    ? `${formatNumber(high)}°C`
                    : t('notAvailable')
                }
              </strong>

              <span>
                Low:
                ${
                  Number.isFinite(Number(low))
                    ? `${formatNumber(low)}°C`
                    : t('notAvailable')
                }
              </span>

              <span>
                Rain probability:
                ${
                  Number.isFinite(Number(rainProbability))
                    ? `${formatNumber(rainProbability)}%`
                    : t('notAvailable')
                }
              </span>

              <span>
                Rainfall:
                ${
                  Number.isFinite(Number(rainfall))
                    ? `${formatNumber(rainfall)} mm`
                    : t('notAvailable')
                }
              </span>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

 function renderTemporaryWeatherAlerts(weather) {
  const hourly = weather?.hourly;

  if (
    !hourly ||
    !Array.isArray(hourly.time) ||
    !hourly.time.length
  ) {
    return emptyBlock('noAlerts');
  }

  const alerts = [];

  for (let i = 1; i < hourly.time.length; i++) {
    const probability =
      Number(hourly.precipitation_probability?.[i] ?? 0);

    const precipitation =
      Number(hourly.precipitation?.[i] ?? 0);

    const time = hourly.time[i];

    if (probability >= 70 && precipitation >= 1) {
      alerts.push({
        title: 'Rain expected',
        condition: `Rain probability ${probability}%`,
        expectedTime: time,
        recommendation:
          'Consider postponing irrigation and protect harvested crops.'
      });
    }
  }

  if (!alerts.length) {
    return `
      <div class="empty-state">
        <p>✓ No significant rain alerts for the available forecast.</p>
      </div>
    `;
  }

  return `
    <div class="detailed-alert-list">
      ${alerts.slice(0, 5).map((alert) => `
        <article>
          <div class="alert-title">
            <span aria-hidden="true">🌧️</span>
            <strong>${escapeHtml(alert.title)}</strong>
          </div>

          <p>
            <b>Expected:</b>
            ${formatDate(alert.expectedTime)}
          </p>

          <p>
            <b>${escapeHtml(alert.condition)}</b>
          </p>

          <p>
            <b>Recommendation:</b>
            ${escapeHtml(alert.recommendation)}
          </p>
        </article>
      `).join('')}
    </div>
  `;
}

  function cropTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('cropTitle', 'cropSubtitle')}
      <div class="advisor-grid">
        <section class="form-card advisor-form"><div class="panel-header"><div><p class="eyebrow">AI</p><h2>${t('cropRecommendation')}</h2></div></div><p class="form-copy">${t('cropFormHint')}</p>
          <form id="crop-form" novalidate><div class="form-grid three-col">
            ${inputField('nitrogen', profileValue(profile, 'nitrogen', 'N'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
            ${inputField('phosphorus', profileValue(profile, 'phosphorus', 'P'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
            ${inputField('potassium', profileValue(profile, 'potassium', 'K'), { type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
            ${inputField('ph', profileValue(profile, 'soilPh', 'ph'), { type: 'number', min: '0', max: '14', step: '0.01', inputmode: 'decimal', required: true })}
            ${inputField('temperature', '', { id: 'crop-temperature', type: 'number', step: 'any', inputmode: 'decimal' })}
            ${inputField('humidity', '', { type: 'number', min: '0', max: '100', step: 'any', inputmode: 'decimal' })}
            ${inputField('rainfall', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
            ${inputField('soilType', profileValue(profile, 'soilType', 'soil'), { id: 'crop-soilType' })}
            ${inputField('season', profileValue(profile, 'season'), { id: 'crop-season' })}
            ${inputField('waterAvailability', '', { id: 'crop-waterAvailability' })}
            ${inputField('farmArea', profileValue(profile, 'farmArea', 'area'), { id: 'crop-farmArea', type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
            ${inputField('location', profileValue(profile, 'location'), { id: 'crop-location' })}
          </div><div class="form-footer"><div id="crop-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'crop-submit', label: 'recommendCrops', type: 'submit', icon: '✦' })}</div></form>
        </section>
        <section class="result-card" id="crop-result" aria-live="polite"><div class="panel-header"><h2>${t('cropResult')}</h2></div>${emptyBlock('resultPending')}</section>
        <section class="form-card advisor-form"><div class="panel-header"><div><p class="eyebrow">SEED</p><h2>${t('seedAdvisor')}</h2></div></div><p class="form-copy">${t('seedFormHint')}</p>
          <form id="seed-form" novalidate><div class="form-grid two-col">
            ${inputField('currentCrop', profileValue(profile, 'currentCrop', 'crop'), { id: 'seed-crop', required: true })}
            ${inputField('location', profileValue(profile, 'location'), { id: 'seed-location', required: true })}
            ${inputField('soilType', profileValue(profile, 'soilType', 'soil'), { id: 'seed-soilType' })}
            ${inputField('season', profileValue(profile, 'season'), { id: 'seed-season' })}
            ${inputField('farmArea', profileValue(profile, 'farmArea', 'area'), { id: 'seed-farmArea', type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
            ${inputField('waterAvailability', '', { id: 'seed-waterAvailability' })}
          </div><div class="form-footer"><div id="seed-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'seed-submit', label: 'recommendSeeds', type: 'submit', icon: '✦' })}</div></form>
        </section>
        <section class="result-card" id="seed-result" aria-live="polite"><div class="panel-header"><h2>${t('seedResult')}</h2></div>${emptyBlock('resultPending')}</section>
      </div>`;
  }

  function healthTemplate() {
    return `${pageHeading('healthTitle', 'healthSubtitle')}
      <section class="form-intro"><span aria-hidden="true">⌕</span><p>${t('healthIntro')}</p></section>
      <div class="health-grid"><section class="form-card disease-form"><form id="disease-form" novalidate>
        <div class="upload-control"><label class="upload-dropzone" for="disease-image"><span class="upload-icon" aria-hidden="true">▧</span><strong>${t('chooseImage')}</strong><span>${t('serviceDataOnly')}</span><input id="disease-image" name="image" type="file" accept="image/*" required aria-describedby="disease-file-status"></label>
        <p id="disease-file-status" class="form-status" role="status">${t('noImage')}</p></div>
        <div id="image-preview-wrap" class="image-preview-wrap" hidden><img id="image-preview" alt=""><button class="text-button danger-text" type="button" data-action="remove-image">${t('removeImage')}</button></div>
        <div class="form-grid"><div class="field">${inputField('cropForImage', '', { id: 'disease-crop' })}</div></div>
        <div class="form-footer"><div id="disease-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'disease-submit', label: 'analyzeImage', type: 'submit', icon: '⌕' })}</div>
      </form></section>
      <section class="result-card disease-result" id="disease-result" aria-live="polite"><div class="panel-header"><h2>${t('analysisResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function irrigationTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('irrigationTitle', 'irrigationSubtitle')}
      <div class="single-tool-grid"><section class="form-card"><p class="form-copy">${t('irrigationHint')}</p><form id="irrigation-form" novalidate><div class="form-grid three-col">
        ${inputField('currentCrop', profileValue(profile, 'currentCrop', 'crop'), { id: 'irrigation-crop', required: true })}
        ${inputField('cropStage', '', { required: true })}
        ${inputField('soilType', profileValue(profile, 'soilType', 'soil'), { id: 'irrigation-soilType' })}
        ${inputField('soilMoisture', '', { type: 'number', min: '0', max: '100', step: 'any', inputmode: 'decimal' })}
        ${inputField('rainForecast', '', { type: 'number', min: '0', max: '100', step: 'any', inputmode: 'decimal' })}
        ${inputField('ambientTemperature', '', { id: 'irrigation-temperature', type: 'number', step: 'any', inputmode: 'decimal' })}
        ${inputField('humidity', '', { id: 'irrigation-humidity', type: 'number', min: '0', max: '100', step: 'any', inputmode: 'decimal' })}
        ${inputField('waterSource', profileValue(profile, 'waterSource'), { id: 'irrigation-waterSource' })}
      </div><div class="form-footer"><div id="irrigation-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'irrigation-submit', label: 'getAdvice', type: 'submit', icon: '≈' })}</div></form></section>
      <section class="result-card" id="irrigation-result" aria-live="polite"><div class="panel-header"><h2>${t('irrigationResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function fertilizerTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('fertilizerTitle', 'fertilizerSubtitle')}
      <div class="notice notice-warning"><span aria-hidden="true">!</span><p>${t('fertilizerHint')}</p></div>
      <div class="single-tool-grid"><section class="form-card"><form id="fertilizer-form" novalidate><div class="form-grid three-col">
        ${inputField('crop', profileValue(profile, 'currentCrop', 'crop'), { id: 'fertilizer-crop', required: true })}
        ${inputField('growthStage', '')}
        ${inputField('nitrogen', profileValue(profile, 'nitrogen'), { id: 'fertilizer-nitrogen', type: 'number', min: '0', max: '10000', step: 'any', inputmode: 'decimal' })}
        ${inputField('phosphorus', profileValue(profile, 'phosphorus'), { id: 'fertilizer-phosphorus', type: 'number', min: '0', max: '10000', step: 'any', inputmode: 'decimal' })}
        ${inputField('potassium', profileValue(profile, 'potassium'), { id: 'fertilizer-potassium', type: 'number', min: '0', max: '10000', step: 'any', inputmode: 'decimal' })}
      </div><div class="form-footer"><div id="fertilizer-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'fertilizer-submit', label: 'requestFertilizerAdvice', type: 'submit', icon: '⌬' })}</div></form></section>
      <section class="result-card" id="fertilizer-result" aria-live="polite"><div class="panel-header"><h2>${t('fertilizerResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function pestTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('pestTitle', 'pestSubtitle')}
      <section class="form-intro"><span aria-hidden="true">!</span><p>${t('pestHint')}</p></section>
      <div class="single-tool-grid"><section class="form-card"><form id="pest-form" novalidate><div class="form-grid">
        ${inputField('crop', profileValue(profile, 'currentCrop', 'crop'), { id: 'pest-crop', required: true })}
        ${textareaField('problem', '', { id: 'pest-problem', rows: 5, required: true })}
      </div><div class="form-footer"><div id="pest-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'pest-submit', label: 'requestPestGuidance', type: 'submit', icon: '⚑' })}</div></form></section>
      <section class="result-card" id="pest-result" aria-live="polite"><div class="panel-header"><h2>${t('pestResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function yieldTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('yieldTitle', 'yieldSubtitle')}
      <div class="single-tool-grid"><section class="form-card"><p class="form-copy">${t('yieldHint')}</p><form id="yield-form" novalidate><div class="form-grid three-col">
        ${inputField('currentCrop', profileValue(profile, 'currentCrop', 'crop'), { id: 'yield-crop', required: true })}
        ${inputField('farmArea', profileValue(profile, 'farmArea', 'area'), { id: 'yield-area', type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('seedVariety', profileValue(profile, 'cropVariety', 'variety'))}
        ${inputField('soilType', profileValue(profile, 'soilType', 'soil'), { id: 'yield-soilType' })}
        ${inputField('irrigationMethod', profileValue(profile, 'irrigationMethod'), { id: 'yield-irrigationMethod' })}
        ${inputField('plantingDate', profileValue(profile, 'plantingDate'), { id: 'yield-plantingDate', type: 'date' })}
        ${inputField('previousYield', profileValue(profile, 'previousYield'), { id: 'yield-previousYield', type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
        ${textareaField('fertilizerInformation', '', { rows: 2 })}
      </div><div class="form-footer"><div id="yield-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'yield-submit', label: 'requestYield', type: 'submit', icon: '↗' })}</div></form></section>
      <section class="result-card" id="yield-result" aria-live="polite"><div class="panel-header"><h2>${t('yieldResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function calculatorTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('calculatorTitle', 'calculatorSubtitle')}
      <div class="single-tool-grid"><section class="form-card"><p class="form-copy">${t('calculatorHint')}</p><form id="calculator-form" novalidate><div class="form-grid three-col">
        ${inputField('farmArea', profileValue(profile, 'farmArea', 'area'), { id: 'calc-area', type: 'number', min: '0.001', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('expectedYield', '', { id: 'calc-yield', type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('sellingPrice', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('seedCost', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
        ${inputField('fertilizerCost', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
        ${inputField('pesticideCost', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
        ${inputField('labourCost', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
        ${inputField('irrigationCost', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
        ${inputField('otherCosts', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' })}
      </div><div class="form-footer"><div id="calculator-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'calculator-submit', label: 'calculateFarm', type: 'submit', icon: '▣' })}</div></form></section>
      <section class="result-card" id="calculator-result" aria-live="polite"><div class="panel-header"><h2>${t('calculatorResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function pesticideTemplate() {
    const profile = state.profile || {};
    return `${pageHeading('pesticideTitle', 'pesticideSubtitle')}
      <div class="notice notice-warning"><span aria-hidden="true">!</span><div><strong>${t('labelWarning')}</strong><p>${t('pesticideHint')}</p></div></div>
      <div class="single-tool-grid"><section class="form-card"><form id="pesticide-form" novalidate><div class="form-grid three-col">
        ${inputField('farmArea', profileValue(profile, 'farmArea', 'area'), { id: 'pesticide-area', type: 'number', min: '0.001', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('product', '', { required: true })}
        ${inputField('activeIngredient', '')}
        ${inputField('labelDosage', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('dosageUnit', '', { required: true })}
        ${inputField('waterVolumePerAcre', '', { type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true })}
        ${inputField('tankCapacity', '', { type: 'number', min: '0.001', step: 'any', inputmode: 'decimal', required: true })}
      </div><div class="form-footer"><div id="pesticide-form-status" class="form-status" role="status" aria-live="polite"></div>${primaryButton({ id: 'pesticide-submit', label: 'calculatePesticide', type: 'submit', icon: '◌' })}</div></form></section>
      <section class="result-card" id="pesticide-result" aria-live="polite"><div class="panel-header"><h2>${t('pesticideResult')}</h2></div>${emptyBlock('resultPending')}</section></div>`;
  }

  function copilotTemplate() {
    return `${pageHeading('copilotTitle', 'copilotSubtitle')}
      <section class="form-intro"><span aria-hidden="true">✺</span><p>${t('copilotHint')}</p></section>
      <section class="copilot-shell"><div class="conversation" id="conversation" aria-live="polite">${renderConversation()}</div>
        <form class="copilot-composer" id="copilot-form" novalidate><label class="sr-only" for="copilot-message">${t('messageLabel')}</label><textarea id="copilot-message" name="message" rows="3" required placeholder="${escapeAttribute(t('messagePlaceholder'))}"></textarea>
          <div class="composer-actions"><div><button class="button button-secondary icon-text-button" type="button" id="voice-input" aria-pressed="false"><span aria-hidden="true">◉</span><span id="voice-input-label">${t('startVoiceInput')}</span></button><span class="form-status" id="copilot-form-status" role="status" aria-live="polite"></span></div>${primaryButton({ id: 'copilot-submit', label: 'send', type: 'submit', icon: '↑' })}</div>
        </form></section>`;
  }

  function renderConversation() {
    if (!state.copilotMessages.length) return emptyBlock('noConversation');
    return state.copilotMessages.map((item, index) => {
      if (item.pending) return `<article class="message assistant-message pending"><div class="message-avatar" aria-hidden="true">✺</div><div class="message-body"><p class="message-author">${t('copilot')}</p>${loadingBlock('processing')}</div></article>`;
      const isUser = item.role === 'user';
      const text = item.text || t('notAvailable');
      return `<article class="message ${isUser ? 'user-message' : 'assistant-message'}"><div class="message-avatar" aria-hidden="true">${isUser ? '●' : '✺'}</div><div class="message-body"><p class="message-author">${isUser ? t('you') : t('copilot')}</p><div class="message-text">${renderRichText(text)}</div>${!isUser ? `<button class="message-speak" type="button" data-speak-index="${index}"><span aria-hidden="true">◖</span>${t('listenResponse')}</button>` : ''}${item.sources?.length ? `<div class="message-sources"><b>${t('responseSources')}:</b> ${item.sources.map((source) => escapeHtml(typeof source === 'string' ? source : source.name || source.title || JSON.stringify(source))).join(', ')}</div>` : ''}</div></article>`;
    }).join('');
  }

  function renderRichText(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
  }

  function historyTemplate() {
    return `${pageHeading('historyTitle', 'historySubtitle', secondaryButton({ action: 'refresh-history', label: 'refresh', icon: '↻' }))}
      <section class="form-intro"><span aria-hidden="true">◷</span><p>${t('historyHint')}</p></section>
      <section class="history-toolbar"><label for="history-search">${t('searchHistory')}</label><div><input id="history-search" type="search" autocomplete="off"><button class="text-button" type="button" data-action="clear-history-search">${t('clearSearch')}</button></div></section>
      <section class="history-list" id="history-list" aria-live="polite">${resourceContent('history', renderHistory, { errorKey: 'historyLoadError', retryAction: 'refresh-history' })}</section>`;
  }

  function historyItems(data) {
    if (Array.isArray(data)) return data;
    return pick(data, ['history', 'records', 'items', 'entries']) || [];
  }

  function renderHistory(data, query = '') {
    const normalized = String(query).trim().toLocaleLowerCase(LOCALES[state.lang]);
    const entries = historyItems(data).filter((record) => !normalized || JSON.stringify(record).toLocaleLowerCase(LOCALES[state.lang]).includes(normalized));
    if (!entries.length) return emptyBlock(normalized ? 'noData' : 'noRecords');
    return entries.map((record) => {
      if (typeof record !== 'object' || record === null) return `<article class="history-record"><p>${escapeHtml(record)}</p></article>`;
      const type = pick(record, ['type', 'recordType', 'category', 'kind']);
      const created = pick(record, ['createdAt', 'timestamp', 'date', 'time']);
      const title = pick(record, ['title', 'name', 'summary', 'message']) || type || t('notAvailable');
      const detailObject = { ...record };
      ['id', '_id', 'type', 'recordType', 'category', 'kind', 'title', 'name', 'summary', 'message', 'createdAt', 'timestamp', 'date', 'time'].forEach((key) => delete detailObject[key]);
      return `<article class="history-record"><div class="history-record-head"><div><p class="eyebrow">${t('recordType')}${type ? ` · ${escapeHtml(type)}` : ''}</p><h2>${escapeHtml(title)}</h2></div>${created ? `<time>${formatDate(created)}</time>` : ''}</div>${renderDataList(detailObject, { limit: 8 })}</article>`;
    }).join('');
  }

  function statusTemplate() {
    return `${pageHeading('statusTitle', 'statusSubtitle', secondaryButton({ action: 'refresh-health', label: 'refresh', icon: '↻' }))}
      <section class="form-intro"><span aria-hidden="true">◉</span><p>${t('statusHint')}</p></section>
      <section class="status-card" id="status-data">${resourceContent('health', renderHealth, { errorKey: 'healthLoadError', retryAction: 'refresh-health' })}</section>`;
  }

  function renderHealth(data) {
    if (!data || typeof data !== 'object') return emptyBlock('noHealthData');
    const explicitServices = Array.isArray(data.services) ? data.services : null;
    let rows = [];
    if (explicitServices) {
      rows = explicitServices.map((entry) => [entry.name || entry.service || t('unknown'), entry.status ?? entry.state ?? t('unknown'), entry.details ?? entry.message ?? '']);
    } else {
      const serviceKeys = ['backend', 'database', 'weather', 'ai', 'ml'];
      rows = serviceKeys.filter((key) => Object.prototype.hasOwnProperty.call(data, key)).map((key) => {
        const value = data[key];
        const status = typeof value === 'object' && value !== null ? pick(value, ['status', 'state', 'healthy', 'available']) : value;
        const details = typeof value === 'object' && value !== null ? pick(value, ['details', 'message', 'reason', 'version']) : '';
        return [t(`health${capitalize(key)}`), status, details];
      });
      if (!rows.length) rows = Object.entries(data).filter(([, value]) => typeof value !== 'object' || value !== null).map(([key, value]) => [friendlyField(key), typeof value === 'object' ? pick(value, ['status', 'state']) : value, typeof value === 'object' ? pick(value, ['details', 'message']) : '']);
    }
    if (!rows.length) return emptyBlock('noHealthData');
    return `<div class="table-wrap"><table><thead><tr><th>${t('service')}</th><th>${t('status')}</th><th>${t('details')}</th></tr></thead><tbody>${rows.map(([name, status, details]) => `<tr><td>${escapeHtml(name || t('unknown'))}</td><td><span class="status-pill ${statusTone(status)}">${formatValue(status, 'status')}</span></td><td>${details ? formatValue(details, 'details') : '—'}</td></tr>`).join('')}</tbody></table></div>${renderDataList(data, { omit: ['services', 'backend', 'database', 'weather', 'ai', 'ml'], limit: 6 })}`;
  }

  function statusTone(value) {
    const normalized = String(value ?? '').toLowerCase();
    if (['healthy', 'ok', 'available', 'up', 'true', 'connected'].includes(normalized)) return 'positive';
    if (['unhealthy', 'down', 'unavailable', 'false', 'error', 'failed'].includes(normalized)) return 'negative';
    return 'neutral';
  }

  function renderDataList(data, { omit = [], limit = 12 } = {}) {
    if (!data || typeof data !== 'object') return '';
    const entries = Object.entries(data).filter(([key, value]) => !omit.includes(key) && hasValue(value)).slice(0, limit);
    if (!entries.length) return '';
    return `<dl class="data-list">${entries.map(([key, value]) => `<div><dt>${friendlyField(key)}</dt><dd>${formatValue(value, key)}</dd></div>`).join('')}</dl>`;
  }
function renderFertilizerResult(data) {
  if (!data || typeof data !== 'object') {
    return emptyBlock('noData');
  }
    if (data.recommendation) {
    const rec = data.recommendation;

    const soilValues = Array.isArray(data.soilTest)
      ? data.soilTest.filter(
          item =>
            item &&
            item.value !== null &&
            item.value !== undefined &&
            item.value !== ''
        )
      : [];

    return `
      <div class="result-data fertilizer-result">

        <section class="management-list">
          <h3>${escapeHtml(String(rec.title || 'Fertilizer recommendation'))}</h3>
          <p>
            ${escapeHtml(
              String(
                rec.recommendation ||
                'Follow the recommended fertilizer programme for this crop and stage.'
              )
            )}
          </p>
        </section>

        <section class="management-list">
          <h3>What to do</h3>
          <p>
            ${escapeHtml(
              String(
                rec.action ||
                'Follow the locally recommended fertilizer schedule.'
              )
            )}
          </p>
        </section>

        ${
          rec.note
            ? `
              <section class="management-list">
                <h3>Why</h3>
                <p>${escapeHtml(String(rec.note))}</p>
              </section>
            `
            : ''
        }

        ${
          soilValues.length
            ? `
              <section class="management-list">
                <h3>Soil test values</h3>

                ${soilValues
                  .map(
                    item => `
                      <div class="irrigation-advice-item">
                        <strong>${escapeHtml(String(item.nutrient))}</strong>
                        <span>${escapeHtml(String(item.value))}</span>
                      </div>
                    `
                  )
                  .join('')}
              </section>
            `
            : ''
        }

      </div>
    `;
  }

  const crop = hasValue(data.crop)
    ? `<div class="irrigation-advice-item">
         <strong>Crop</strong>
         <span>${escapeHtml(String(data.crop))}</span>
       </div>`
    : '';

  const growthStage = hasValue(data.growthStage)
    ? `<div class="irrigation-advice-item">
         <strong>Growth stage</strong>
         <span>${escapeHtml(String(data.growthStage))}</span>
       </div>`
    : '';

  const findings = Array.isArray(data.findings)
    ? data.findings.filter(
        (item) => item && typeof item === 'object'
      )
    : [];

  const findingsHtml = findings.length
    ? findings.map((finding) => {
        const nutrient = finding.nutrient || 'Nutrient';
       const recordedValue =
  finding.recordedValue === null ||
  finding.recordedValue === undefined ||
  finding.recordedValue === ''
    ? 'Not supplied'
    : finding.recordedValue;

        const status = hasValue(finding.status)
          ? finding.status
          : '';

        const recommendation = hasValue(finding.recommendation)
          ? finding.recommendation
          : '';

        return `
          <section class="management-list">
            <h3>${escapeHtml(String(nutrient))}</h3>

            <div class="irrigation-advice-item">
              <strong>Recorded value</strong>
              <span>${escapeHtml(String(recordedValue))}</span>
            </div>

            ${
              status
                ? `
                  <div class="irrigation-advice-item">
                    <strong>Status</strong>
                    <span>${escapeHtml(String(status))}</span>
                  </div>
                `
                : ''
            }

            ${
              recommendation
                ? `
                  <div class="irrigation-advice-item">
                    <strong>Observation</strong>
                    <span>${escapeHtml(String(recommendation))}</span>
                  </div>
                `
                : ''
            }
          </section>
        `;
      }).join('')
    : `
        <p>No nutrient values were supplied for review.</p>
      `;

  return `
    <div class="result-data fertilizer-result">

      ${
        crop || growthStage
          ? `
            <section class="management-list">
              <h3>Crop information</h3>
              ${crop}
              ${growthStage}
            </section>
          `
          : ''
      }

      <section class="management-list">
        <h3>Nutrient review</h3>
        ${findingsHtml}
      </section>

      ${
        hasValue(data.management)
          ? `
            <section class="management-list">
              <h3>Management</h3>
              <p>${escapeHtml(String(data.management))}</p>
            </section>
          `
          : ''
      }
    </div>
  `;
}
  function renderServiceResult(data, { kind = 'generic' } = {}) {
    if (!hasValue(data)) return emptyBlock('noData');
    const root = data?.result && typeof data.result === 'object' ? data.result : data;
    const list = kind === 'crop'
      ? pick(root, ['recommendations', 'crops', 'topRecommendations', 'results'])
      : kind === 'seed'
        ? pick(root, ['recommendations', 'seeds', 'varieties', 'results'])
        : null;
    if (Array.isArray(list)) return renderRecommendationCards(list, kind, root);
    if (kind === 'irrigation') return renderIrrigationResult(root);
    if (kind === 'disease') return renderDiseaseResult(root);
    if (kind === 'fertilizer') return renderFertilizerResult(root);
    if (kind === 'pest') return renderPestResult(root);
    return `<div class="result-data">${renderDataList(root)}${typeof root === 'string' ? `<p>${escapeHtml(root)}</p>` : ''}</div>`;
  }

function renderIrrigationResult(data) {
  if (!data || typeof data !== 'object') {
    return emptyBlock('noData');
  }

  const decision = String(
    data.decision || 'Monitor soil moisture'
  );

  const reasons = Array.isArray(data.reasons)
    ? data.reasons.filter(Boolean)
    : [];

  const normalizedDecision = decision.toLowerCase();

  let action;

  if (
    normalizedDecision.includes('delay') ||
    normalizedDecision.includes('can be delayed')
  ) {
    action =
      'Delay irrigation for now. Monitor the field and check the root-zone soil moisture again after the expected rainfall.';
  } else if (
    normalizedDecision.includes('needed now')
  ) {
    action =
      'Check the root-zone soil moisture now. If the soil is genuinely dry and irrigation is appropriate for this crop stage, irrigate according to local crop and soil guidance.';
  } else if (
    normalizedDecision.includes('monitor')
  ) {
    action =
      'Do not irrigate immediately. Check the root-zone soil moisture again and reassess the field before irrigating.';
  } else {
    action =
      'Check the root-zone soil moisture before deciding whether irrigation is needed.';
  }

  return `
    <div class="result-data irrigation-result">

      <section class="management-list">
        <section>
          <h3>Decision</h3>
          <div>
            <strong>${escapeHtml(decision)}</strong>
          </div>
        </section>
      </section>

      <section class="management-list">
        <h3>Why?</h3>

        ${
          reasons.length
            ? reasons.map(reason => `
                <section>
                  <div>• ${escapeHtml(reason)}</div>
                </section>
              `).join('')
            : `
                <section>
                  <div>
                    Check the crop root-zone soil moisture before irrigating.
                  </div>
                </section>
              `
        }
      </section>

      <section class="management-list">
        <h3>What to do</h3>

        <section>
          <div>${escapeHtml(action)}</div>
        </section>
      </section>

    </div>
  `;
}

  function renderPestResult(data) {
    if (!data || typeof data !== 'object') return emptyBlock('noData');
    const summary = [['crop', data.crop], ['problem', data.problem], ['scope', data.scope]].filter(([, value]) => hasValue(value));
    const recommendations = Array.isArray(data.recommendations) ? data.recommendations.filter((item) => item && typeof item === 'object') : [];
    return `<div class="result-data pest-result">${summary.length ? `<dl class="data-list compact">${summary.map(([key, value]) => `<div><dt>${t(key)}</dt><dd>${formatValue(value, key)}</dd></div>`).join('')}</dl>` : ''}
      <section class="management-list"><h3>${t('recommendations')}</h3>${recommendations.length ? recommendations.map((item) => `<section><h3>${hasValue(item.priority) ? `${t('priority')} ${formatValue(item.priority, 'priority')}: ` : ''}${formatValue(item.what, 'what')}</h3><div>${hasValue(item.why) ? `<p><b>${t('why')}:</b> ${formatValue(item.why, 'why')}</p>` : ''}${hasValue(item.how) ? `<p><b>${t('how')}:</b> ${formatValue(item.how, 'how')}</p>` : ''}${hasValue(item.when) ? `<p><b>${t('when')}:</b> ${formatValue(item.when, 'when')}</p>` : ''}</div></section>`).join('') : `<p>${t('noData')}</p>`}</section>
      ${hasValue(data.pesticideNotice) ? `<div class="notice notice-warning"><span aria-hidden="true">!</span><div><strong>${t('pesticideNotice')}</strong><p>${formatValue(data.pesticideNotice, 'pesticideNotice')}</p></div></div>` : ''}</div>`;
  }

  function renderRecommendationCards(items, kind, root) {
    if (!items.length) return emptyBlock('noData');
    return `<div class="recommendation-list">${items.map((item) => {
      if (typeof item !== 'object' || item === null) return `<article class="recommendation"><h3>${escapeHtml(item)}</h3></article>`;
      const name = pick(item, kind === 'seed' ? ['variety', 'seedVariety', 'name', 'title'] : ['crop', 'name', 'title', 'label']);
      const why = pick(item, ['whyRecommended', 'why', 'reason', 'explanation', 'rationale']);
      const score = pick(item, ['suitabilityScore', 'score']);
      const probability = pick(item, ['probability']);
      const entries = kind === 'seed'
        ? [['region', pick(item, ['region'])], ['duration', pick(item, ['duration'])], ['seedRequirement', pick(item, ['seedRequirement', 'seedRate'])], ['expectedYield', pick(item, ['expectedYield'])], ['price', pick(item, ['price'])], ['priceUnit', pick(item, ['priceUnit', 'unit'])], ['source', pick(item, ['source'])], ['lastUpdated', pick(item, ['lastUpdated', 'updatedAt'])]]
        : [['suitabilityScore', score], ['modelProbability', probability]];
      return `<article class="recommendation"><h3>${escapeHtml(name || t('notAvailable'))}</h3>${why ? `<div class="recommendation-why"><b>${t('whyRecommended')}</b><p>${formatValue(why, 'explanation')}</p></div>` : ''}<dl class="data-list compact">${entries.filter(([, value]) => hasValue(value)).map(([key, value]) => `<div><dt>${t(key)}</dt><dd>${formatValue(value, key)}</dd></div>`).join('')}${kind === 'seed' && !hasValue(pick(item, ['price'])) ? `<div><dt>${t('price')}</dt><dd>${t('priceUnavailable')}</dd></div>` : ''}</dl></article>`;
    }).join('')}</div>`;
  }

 function renderDiseaseResult(data) {
  if (!data || typeof data !== 'object') {
    return emptyBlock('noData');
  }

  const diagnosis = pick(data, [
    'disease',
    'diseaseName',
    'prediction',
    'predictedClass',
    'class',
    'label'
  ]);

  const probability = pick(data, [
    'probability',
    'confidence',
    'score'
  ]);

  const fields = [
    ['symptoms', pick(data, ['symptoms'])],
    ['explanation', pick(data, ['explanation', 'description'])],
    ['organicManagement', pick(data, ['organicManagement', 'organic'])],
    ['ipm', pick(data, ['ipm', 'integratedPestManagement'])],
    ['chemicalManagement', pick(data, ['chemicalManagement', 'chemical'])],
    ['prevention', pick(data, ['prevention'])]
  ].filter(([, value]) => hasValue(value));

  const voiceText = fields
    .map(([key, value]) =>
      `${t(key)}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
    )
    .join('. ');

  const diseaseName = diagnosis || t('notAvailable');

  return `
    <div class="disease-analysis">

      <div class="diagnosis">
        <p>${t('diseaseName')}</p>
        <strong>${escapeHtml(diseaseName)}</strong>

        ${
          hasValue(probability)
            ? `<span>${t('probability')}: ${formatValue(probability, 'probability')}</span>`
            : ''
        }
      </div>

      ${
        data.lowConfidence === true
          ? `
            <div class="notice notice-warning">
              <span aria-hidden="true">!</span>
              <p>${t('lowConfidence')}</p>
            </div>
          `
          : ''
      }

      <!-- Disease Translation -->
      <section class="translation-section">

        <h3>🌐 Translate Disease</h3>

        <div class="translation-buttons">

          <button
            type="button"
            class="button button-secondary"
            data-action="translate-disease"
            data-target-language="en"
          >
            English
          </button>

          <button
            type="button"
            class="button button-secondary"
            data-action="translate-disease"
            data-target-language="te"
          >
            తెలుగు
          </button>

          <button
            type="button"
            class="button button-secondary"
            data-action="translate-disease"
            data-target-language="hi"
          >
            हिन्दी
          </button>

        </div>

        <div
          class="translation-result"
          aria-live="polite"
        ></div>

      </section>

      <div class="management-list">

        ${
          fields
            .map(
              ([key, value]) => `
                <section>
                  <h3>${t(key)}</h3>
                  <div>${formatValue(value, key)}</div>
                </section>
              `
            )
            .join('')
        }

      </div>

      ${
        voiceText
          ? `
            <button
              type="button"
              class="button button-secondary"
              data-action="speak-disease"
              data-speech="${escapeAttribute(voiceText)}"
            >
              <span aria-hidden="true">◖</span>
              ${t('voiceExplanation')}
            </button>
          `
          : ''
      }

      ${renderDataList(data, {
        omit: [
          'disease',
          'diseaseName',
          'prediction',
          'predictedClass',
          'class',
          'label',
          'probability',
          'confidence',
          'score',
          'symptoms',
          'explanation',
          'description',
          'organicManagement',
          'organic',
          'ipm',
          'integratedPestManagement',
          'chemicalManagement',
          'chemical',
          'prevention',
          'lowConfidence'
        ],
        limit: 8
      })}

    </div>
  `;
}

  function renderView() {
    const app = document.getElementById('app');
    if (!app) return;
    const templates = {
      dashboard: dashboardTemplate, farm: farmTemplate, weather: weatherTemplate, crop: cropTemplate, health: healthTemplate,
      irrigation: irrigationTemplate, fertilizer: fertilizerTemplate, pest: pestTemplate, yield: yieldTemplate,
      calculator: calculatorTemplate, pesticide: pesticideTemplate,
      copilot: copilotTemplate, history: historyTemplate, status: statusTemplate
    };
    app.setAttribute('aria-busy', 'false');
    app.innerHTML = templates[state.activeView]();
    updateStaticText();
    renderNavigation();
    updateFarmSummary();
    updateConnectionIndicator();
    bindViewEvents();
  }

  function setViewBusy(isBusy) {
    const app = document.getElementById('app');
    if (app) app.setAttribute('aria-busy', String(isBusy));
  }

  function setResourceLoading(name) {
    const item = state.resources[name];
    if (item) {
      item.status = 'loading';
      item.error = null;
    }
  }

  async function loadResource(name, action) {
    const entry = state.resources[name];
    if (entry?.promise) return entry.promise;
    setResourceLoading(name);
    const promise = Promise.resolve().then(action).then((data) => {
      state.resources[name] = { status: 'ready', data, error: null, promise: null };
      return data;
    }).catch((error) => {
      state.resources[name] = { status: 'error', data: null, error, promise: null };
      throw error;
    });
    entry.promise = promise;
    return promise;
  }

  async function fetchProfile() {
    try {
      const data = await loadResource('profile', api.profile);
      state.profile = data?.profile ?? data ?? null;
      if (!state.profile || typeof state.profile !== 'object') state.profile = null;
      const serverLanguage = state.profile?.preferredLanguage;
      if (serverLanguage && ['en', 'te', 'hi'].includes(serverLanguage) && !safeGetStorage('agrisaathi-language')) {
        state.lang = serverLanguage;
        safeSetStorage('agrisaathi-language', state.lang);
        updateStaticText();
      }
      updateFarmSummary();
      return state.profile;
    } catch (error) {
      state.profile = null;
      updateFarmSummary();
      throw error;
    }
  }

  function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSetStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* browser storage may be unavailable */ }
  }

  async function refreshDashboard() {
    setResourceLoading('profile'); setResourceLoading('health'); setResourceLoading('weather'); setResourceLoading('alerts'); setResourceLoading('plan');
    renderView(); setViewBusy(true);
    await Promise.allSettled([
      fetchProfile(), loadResource('health', api.health), loadResource('weather', api.weather), loadResource('alerts', api.alerts), loadResource('plan', api.plan)
    ]);
    setViewBusy(false);
    updateConnectionIndicator();
    if (state.activeView === 'dashboard') renderView();
  }

  async function refreshWeather() {
    setResourceLoading('weather'); setResourceLoading('alerts');
    if (!state.profile && state.resources.profile.status !== 'loading') {
      try { await fetchProfile(); } catch (_) { /* render weather endpoint error if it occurs */ }
    }
    renderView(); setViewBusy(true);
    await Promise.allSettled([loadResource('weather', api.weather), loadResource('alerts', api.alerts)]);
    setViewBusy(false);
    if (state.activeView === 'weather') renderView();
  }
  function handleCurrentLocationSearch(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const query = String(formData.get('location') || '').trim();

  state.locationSearchQuery = query;
  state.locationSearchError = '';
  state.locationSearchResults = [];

  if (!query) {
    state.locationSearchError = 'Enter a location to search.';
    renderView();
    return;
  }

  searchLocation(query);
}

async function searchLocation(query) {
  state.locationSearchLoading = true;
  state.locationSearchError = '';
  renderView();

  try {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(query)}` +
      `&count=8` +
      `&language=en` +
      `&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Location search failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    state.locationSearchResults =
      Array.isArray(data.results)
        ? data.results
        : [];

    if (!state.locationSearchResults.length) {
      state.locationSearchError = 'No locations found.';
    }
  } catch (error) {
    console.error('Location search error:', error);
    state.locationSearchError = 'Could not search this location.';
  } finally {
    state.locationSearchLoading = false;
    renderView();
  }
}

function selectSearchedLocation(index) {
  const location = state.locationSearchResults[index];

  if (!location) {
    return;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    state.locationSearchError =
      'The selected location has invalid coordinates.';
    renderView();
    return;
  }

  const locationName = [
    location.name,
    location.admin1,
    location.country
  ].filter(Boolean).join(', ');

  state.locationSearchResults = [];
  state.locationSearchError = '';
  state.currentLocationError = '';

  loadWeatherForTemporaryLocation(
    latitude,
    longitude,
    locationName
  );
}

function checkCurrentLocation() {
  if (!navigator.geolocation) {
    state.currentLocationError =
      'Your browser does not support location access.';
    renderView();
    return;
  }

  state.currentLocationLoading = true;
  state.currentLocationError = '';
  state.currentLocationWeather = null;

  renderView();

  navigator.geolocation.getCurrentPosition(
    position => {
      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);

      loadWeatherForTemporaryLocation(
        latitude,
        longitude,
        'Your current location'
      );
    },
    error => {
      console.error('Geolocation error:', error);

      state.currentLocationLoading = false;

      if (error.code === error.PERMISSION_DENIED) {
        state.currentLocationError =
          'Location permission was denied. Allow location access and try again.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        state.currentLocationError =
          'Your current location could not be determined.';
      } else if (error.code === error.TIMEOUT) {
        state.currentLocationError =
          'Location request timed out. Please try again.';
      } else {
        state.currentLocationError =
          'Could not determine your current location.';
      }

      renderView();
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    }
  );
}

async function loadWeatherForTemporaryLocation(
  latitude,
  longitude,
  locationName = ''
) {
  state.currentLocationLoading = true;
  state.currentLocationError = '';

  state.currentLocationCoords = {
    latitude,
    longitude
  };

  state.currentLocationName = locationName;

  renderView();

  try {
    const params = new URLSearchParams({
  latitude: String(latitude),
  longitude: String(longitude),

  current: [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'rain',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'uv_index'
  ].join(','),

  hourly: [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation_probability',
    'precipitation',
    'rain',
    'weather_code',
    'wind_speed_10m'
  ].join(','),

  daily: [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'precipitation_sum',
    'rain_sum',
    'wind_speed_10m_max',
    'uv_index_max'
  ].join(','),

  forecast_days: '7',
  timezone: 'auto'
});

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `Temporary weather request failed: HTTP ${response.status}`
      );
    }

    const weather = await response.json();

    state.currentLocationWeather = weather;

  } catch (error) {
    console.error(
      'Temporary location weather error:',
      error
    );

    state.currentLocationWeather = null;

    state.currentLocationError =
      'Could not load weather for this location.';

  } finally {
    state.currentLocationLoading = false;
    renderView();
  }
}

  async function refreshHistory() {
    setResourceLoading('history'); renderView(); setViewBusy(true);
    await Promise.allSettled([loadResource('history', api.history)]);
    setViewBusy(false);
    if (state.activeView === 'history') renderView();
  }

  async function refreshHealth() {
    setResourceLoading('health'); renderView(); setViewBusy(true);
    await Promise.allSettled([loadResource('health', api.health)]);
    setViewBusy(false); updateConnectionIndicator();
    if (state.activeView === 'status') renderView();
  }

  async function reloadProfile() {
    setResourceLoading('profile'); renderView(); setViewBusy(true);
    await Promise.allSettled([fetchProfile()]);
    setViewBusy(false);
    if (state.activeView === 'farm') renderView();
  }

  function loadForView() {
    if (state.activeView === 'dashboard') refreshDashboard();
    else if (state.activeView === 'weather') renderView();
    else if (state.activeView === 'history') refreshHistory();
    else if (state.activeView === 'status') refreshHealth();
    else if (state.activeView === 'farm' && state.resources.profile.status !== 'ready') reloadProfile();
    else if (!state.profile && state.resources.profile.status === 'idle') fetchProfile().catch(() => undefined);
  }

  function navigate(view) {
    if (!ALLOWED_VIEWS.has(view)) view = 'dashboard';
    if (window.location.hash.replace(/^#/, '') !== view) {
      window.location.hash = view;
      return;
    }
    state.activeView = view;
    closeDrawer();
    renderView();
    loadForView();
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }

  function setButtonBusy(button, isBusy, loadingKey = 'processing') {
    if (!button) return;
    if (isBusy) {
      button.dataset.originalText = button.textContent.trim();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.classList.add('is-loading');
      const textTarget = button.querySelector('span:not(.button-spinner)') || button;
      textTarget.textContent = t(loadingKey);
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.classList.remove('is-loading');
      if (button.dataset.originalText) {
        const textTarget = button.querySelector('span:not(.button-spinner)') || button;
        textTarget.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  function setFormStatus(id, message = '', type = '') {
    const target = document.getElementById(id);
    if (!target) return;
    target.className = `form-status ${type}`.trim();
    target.textContent = message;
  }

  function collectForm(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (typeof value !== 'string') return;
      const cleaned = value.trim();
      if (cleaned === '') return;
      const input = form.elements.namedItem(key);
      if (input?.type === 'number') {
        const numeric = Number(cleaned);
        data[key] = Number.isFinite(numeric) ? numeric : cleaned;
      } else {
        data[key] = cleaned;
      }
    });
    return data;
  }

  function validateForm(form, statusId) {
    if (form.checkValidity()) return true;
    form.reportValidity();
    setFormStatus(statusId, t('formFixErrors'), 'error');
    return false;
  }

  async function handleFarmSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'farm-form-status')) return;
    const button = document.getElementById('farm-save');
    const payload = collectForm(form);
    setFormStatus('farm-form-status', t('saving'));
    setButtonBusy(button, true, 'saving');
    try {
      const data = await api.updateProfile(payload);
      state.profile = data?.profile ?? data ?? payload;
      state.resources.profile = { status: 'ready', data: { profile: state.profile }, error: null, promise: null };
      updateFarmSummary();
      setFormStatus('farm-form-status', t('profileSaved'), 'success');
      toast(t('profileSaved'), 'success');
    } catch (error) {
      setFormStatus('farm-form-status', errorMessage(error, 'profileSaveError'), 'error');
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function handleCropSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'crop-form-status')) return;
    const button = document.getElementById('crop-submit');
    setFormStatus('crop-form-status', t('processing'));
    setButtonBusy(button, true);
    setResultLoading('crop-result', 'cropResult');
    try {
      const data = await api.cropRecommendations(collectForm(form));
      setResult('crop-result', t('cropResult'), renderServiceResult(data, { kind: 'crop' }));
      setFormStatus('crop-form-status', '');
    } catch (error) {
      setResultError('crop-result', 'cropResult', error, 'recommendationUnavailable');
      setFormStatus('crop-form-status', errorMessage(error, 'recommendationUnavailable'), 'error');
    } finally { setButtonBusy(button, false); }
  }

  async function handleSeedSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'seed-form-status')) return;
    const button = document.getElementById('seed-submit');
    setFormStatus('seed-form-status', t('processing')); setButtonBusy(button, true); setResultLoading('seed-result', 'seedResult');
    try {
      const raw = collectForm(form);
      const payload = { ...raw, crop: raw.currentCrop };
      const data = await api.seedRecommendations(payload);
      setResult('seed-result', t('seedResult'), renderServiceResult(data, { kind: 'seed' }));
      setFormStatus('seed-form-status', '');
    } catch (error) {
      setResultError('seed-result', 'seedResult', error, 'seedUnavailable');
      setFormStatus('seed-form-status', errorMessage(error, 'seedUnavailable'), 'error');
    } finally { setButtonBusy(button, false); }
  }

  async function handleDiseaseSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = document.getElementById('disease-image');
    if (!fileInput?.files?.length) {
      setFormStatus('disease-form-status', t('imageRequired'), 'error');
      fileInput?.focus();
      return;
    }
    if (!validateForm(form, 'disease-form-status')) return;
    const button = document.getElementById('disease-submit');
    setFormStatus('disease-form-status', t('processing')); setButtonBusy(button, true); setResultLoading('disease-result', 'analysisResult');
    try {
      const file = fileInput.files[0];
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowedTypes.has(file.type)) throw new ApiError('Only JPEG, PNG, and WebP images are accepted.', { code: 'UNSUPPORTED_IMAGE_TYPE' });
      if (file.size > 8 * 1024 * 1024) throw new ApiError('Image must be no larger than 8 MB.', { code: 'IMAGE_TOO_LARGE' });
      const crop = document.getElementById('disease-crop')?.value.trim();
      const payload = { fileName: file.name, mimeType: file.type, imageBase64: await readFileAsDataUrl(file) };
      if (crop) payload.crop = crop;
      const data = await api.diseaseAnalyze(payload);
      state.diseaseResult = data;
      setResult('disease-result', t('analysisResult'), renderServiceResult(data, { kind: 'disease' }));
      setFormStatus('disease-form-status', '');
    } catch (error) {
      setResultError('disease-result', 'analysisResult', error, 'diseaseLoadError');
      setFormStatus('disease-form-status', errorMessage(error, 'diseaseLoadError'), 'error');
    } finally { setButtonBusy(button, false); }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new ApiError(t('diseaseLoadError'), { code: 'FILE_READ_ERROR' }));
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new ApiError(t('diseaseLoadError'), { code: 'FILE_READ_ERROR' }));
      reader.readAsDataURL(file);
    });
  }

  async function handleIrrigationSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'irrigation-form-status')) return;
    await submitTool({
  form,
  buttonId: 'irrigation-submit',
  statusId: 'irrigation-form-status',
  resultId: 'irrigation-result',
  resultTitle: 'irrigationResult',
  action: api.irrigationAdvice,
  errorKey: 'irrigationUnavailable',
  kind: 'irrigation'
});
  }

  async function handleFertilizerSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'fertilizer-form-status')) return;
    await submitTool({
      form, buttonId: 'fertilizer-submit', statusId: 'fertilizer-form-status', resultId: 'fertilizer-result',
      resultTitle: 'fertilizerResult', action: api.fertilizerAdvice, errorKey: 'fertilizerUnavailable', kind: 'fertilizer'
    });
  }

  async function handlePestSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'pest-form-status')) return;
    await submitTool({
      form, buttonId: 'pest-submit', statusId: 'pest-form-status', resultId: 'pest-result',
      resultTitle: 'pestResult', action: api.pestManagement, errorKey: 'pestUnavailable', kind: 'pest'
    });
  }

  async function handleYieldSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'yield-form-status')) return;
    await submitTool({ form, buttonId: 'yield-submit', statusId: 'yield-form-status', resultId: 'yield-result', resultTitle: 'yieldResult', action: api.yieldPredictions, errorKey: 'yieldUnavailable' });
  }

  async function handleCalculatorSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'calculator-form-status')) return;
    await submitTool({
      form, buttonId: 'calculator-submit', statusId: 'calculator-form-status', resultId: 'calculator-result', resultTitle: 'calculatorResult', errorKey: 'calculationUnavailable',
      action: (raw) => api.farmCalculation({
        area: raw.farmArea,
        areaUnit: state.profile?.areaUnit || 'acre',
        expectedYieldPerAcre: raw.expectedYield,
        sellingPrice: raw.sellingPrice,
        seedCost: raw.seedCost ?? 0,
        fertilizerCost: raw.fertilizerCost ?? 0,
        pesticideCost: raw.pesticideCost ?? 0,
        labourCost: raw.labourCost ?? 0,
        irrigationCost: raw.irrigationCost ?? 0,
        otherCost: raw.otherCosts ?? 0,
        currency: 'INR'
      })
    });
  }

  async function handlePesticideSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form, 'pesticide-form-status')) return;
    await submitTool({
      form, buttonId: 'pesticide-submit', statusId: 'pesticide-form-status', resultId: 'pesticide-result', resultTitle: 'pesticideResult', errorKey: 'pesticideUnavailable',
      action: (raw) => api.pesticideCalculation({
        farmArea: raw.farmArea,
        areaUnit: state.profile?.areaUnit || 'acre',
        productName: raw.product,
        activeIngredient: raw.activeIngredient,
        verifiedDosage: raw.labelDosage,
        dosageUnit: raw.dosageUnit,
        waterPerAcre: raw.waterVolumePerAcre,
        tankCapacity: raw.tankCapacity
      })
    });
  }

  async function submitTool({ form, buttonId, statusId, resultId, resultTitle, action, errorKey, kind = 'generic' }) {
    const button = document.getElementById(buttonId);
    setFormStatus(statusId, t('processing')); setButtonBusy(button, true); setResultLoading(resultId, resultTitle);
    try {
      const data = await action(collectForm(form));
      setResult(resultId, t(resultTitle), renderServiceResult(data, { kind }));
      setFormStatus(statusId, '');
    } catch (error) {
      setResultError(resultId, resultTitle, error, errorKey);
      setFormStatus(statusId, errorMessage(error, errorKey), 'error');
    } finally { setButtonBusy(button, false); }
  }

  async function handleCopilotSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = document.getElementById('copilot-message');
    const message = input?.value.trim();
    if (!message) {
      setFormStatus('copilot-form-status', t('formFixErrors'), 'error');
      input?.focus();
      return;
    }
    const button = document.getElementById('copilot-submit');
    const userMessage = { role: 'user', text: message };
    const pendingMessage = { role: 'assistant', pending: true };
    state.copilotMessages.push(userMessage, pendingMessage);
    input.value = '';
    renderConversationIntoPage();
    setFormStatus('copilot-form-status', t('processing')); setButtonBusy(button, true, 'sending');
    try {
      const data = await api.copilotMessage({ message, language: state.lang });
      const reply = pick(data, ['message', 'reply', 'response', 'text', 'answer']) || (typeof data === 'string' ? data : '');
      const sources = pick(data, ['sources', 'citations', 'references']) || [];
      state.copilotMessages[state.copilotMessages.length - 1] = { role: 'assistant', text: reply || t('notAvailable'), sources: Array.isArray(sources) ? sources : [sources] };
      setFormStatus('copilot-form-status', '');
    } catch (error) {
      state.copilotMessages[state.copilotMessages.length - 1] = { role: 'assistant', text: errorMessage(error, 'copilotUnavailable'), sources: [] };
      setFormStatus('copilot-form-status', errorMessage(error, 'copilotUnavailable'), 'error');
    } finally {
      renderConversationIntoPage();
      setButtonBusy(button, false);
    }
  }

  function setResult(id, title, content) {
    const target = document.getElementById(id);
    if (target) target.innerHTML = `<div class="panel-header"><h2>${title}</h2></div>${content}`;
  }

  function setResultLoading(id, titleKey) {
    const target = document.getElementById(id);
    if (target) target.innerHTML = `<div class="panel-header"><h2>${t(titleKey)}</h2></div>${loadingBlock('processing')}`;
  }

  function setResultError(id, titleKey, error, fallbackKey) {
    const target = document.getElementById(id);
    if (target) target.innerHTML = `<div class="panel-header"><h2>${t(titleKey)}</h2></div>${errorBlock(error, fallbackKey)}`;
  }

  function renderConversationIntoPage() {
    const target = document.getElementById('conversation');
    if (target) {
      target.innerHTML = renderConversation();
      target.scrollTop = target.scrollHeight;
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    const status = document.getElementById('disease-file-status');
    const wrap = document.getElementById('image-preview-wrap');
    const preview = document.getElementById('image-preview');
    if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
    state.imagePreviewUrl = null;
    if (!file) {
      if (status) status.textContent = t('noImage');
      if (wrap) wrap.hidden = true;
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.target.value = '';
      if (status) status.textContent = t('imageRequired');
      if (wrap) wrap.hidden = true;
      return;
    }
    state.imagePreviewUrl = URL.createObjectURL(file);
    if (preview) { preview.src = state.imagePreviewUrl; preview.alt = t('imagePreview'); }
    if (wrap) wrap.hidden = false;
    if (status) status.textContent = `${t('imageChosen')} ${file.name}`;
  }

  function removeImage() {
    const input = document.getElementById('disease-image');
    const wrap = document.getElementById('image-preview-wrap');
    const preview = document.getElementById('image-preview');
    if (input) input.value = '';
    if (preview) preview.removeAttribute('src');
    if (wrap) wrap.hidden = true;
    if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
    state.imagePreviewUrl = null;
    const status = document.getElementById('disease-file-status');
    if (status) status.textContent = t('noImage');
  }

  function requestNotificationPermission() {
    if (!('Notification' in window)) {
      toast(t('notificationUnsupported'), 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      toast(t('notificationGranted'), 'success');
      return;
    }
    if (Notification.permission === 'denied') {
      toast(t('notificationDenied'), 'error');
      return;
    }
    Notification.requestPermission().then((permission) => toast(permission === 'granted' ? t('notificationGranted') : t('notificationDenied'), permission === 'granted' ? 'success' : 'error'))
      .catch(() => toast(t('notificationDenied'), 'error'));
  }

  function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const status = document.getElementById('copilot-form-status');
    const button = document.getElementById('voice-input');
    const label = document.getElementById('voice-input-label');
    if (!Recognition) {
      if (status) setFormStatus('copilot-form-status', t('voiceInputUnsupported'), 'error');
      return;
    }
    if (state.isListening && state.voiceRecognition) {
      state.voiceRecognition.stop();
      return;
    }
    const recognition = new Recognition();
    state.voiceRecognition = recognition;
    recognition.lang = SPEECH_LOCALES[state.lang];
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      state.isListening = true;
      button?.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = t('stopVoiceInput');
      setFormStatus('copilot-form-status', t('listening'));
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      const input = document.getElementById('copilot-message');
      if (input) input.value = transcript.trim();
    };
    recognition.onerror = () => setFormStatus('copilot-form-status', t('voiceInputUnsupported'), 'error');
    recognition.onend = () => {
      state.isListening = false;
      state.voiceRecognition = null;
      button?.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = t('startVoiceInput');
      if (status?.textContent === t('listening')) setFormStatus('copilot-form-status', '');
    };
    try { recognition.start(); } catch (_) { setFormStatus('copilot-form-status', t('voiceInputUnsupported'), 'error'); }
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      toast(t('speechUnsupported'), 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALES[state.lang];
    window.speechSynthesis.speak(utterance);
  }

  function toast(message, tone = '') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${tone}`;
    toastElement.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toastElement.textContent = message;
    region.appendChild(toastElement);
    window.setTimeout(() => toastElement.remove(), 5000);
  }

  function openDrawer() {
    document.body.classList.add('drawer-open');
    const toggle = document.getElementById('menu-toggle');
    const scrim = document.getElementById('drawer-scrim');
    toggle?.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
  }

  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    const toggle = document.getElementById('menu-toggle');
    const scrim = document.getElementById('drawer-scrim');
    toggle?.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
  }

  function bindViewEvents() {
    document.getElementById('farm-form')?.addEventListener('submit', handleFarmSubmit);
    document.getElementById('crop-form')?.addEventListener('submit', handleCropSubmit);
    document.getElementById('seed-form')?.addEventListener('submit', handleSeedSubmit);
    document.getElementById('disease-form')?.addEventListener('submit', handleDiseaseSubmit);
    document.getElementById('disease-image')?.addEventListener('change', handleImageChange);
    document.getElementById('irrigation-form')?.addEventListener('submit', handleIrrigationSubmit);
    document.getElementById('fertilizer-form')?.addEventListener('submit', handleFertilizerSubmit);
    document.getElementById('pest-form')?.addEventListener('submit', handlePestSubmit);
    document.getElementById('yield-form')?.addEventListener('submit', handleYieldSubmit);
    document.getElementById('calculator-form')?.addEventListener('submit', handleCalculatorSubmit);
    document.getElementById('pesticide-form')?.addEventListener('submit', handlePesticideSubmit);
    document.getElementById('copilot-form')?.addEventListener('submit', handleCopilotSubmit);
    document.getElementById('voice-input')?.addEventListener('click', startVoiceInput);
    document.getElementById('history-search')?.addEventListener('input', (event) => {
        const target = document.getElementById('history-list');
  const resourceState = state.resources.history;

  if (target && resourceState.status === 'ready') {
    target.innerHTML = renderHistory(resourceState.data, event.target.value);
  }
});
  document.addEventListener('click', (event) => {
  const button = event.target.closest('#current-location-search-form button[type="submit"]');

  if (button) {
    event.preventDefault();
    handleCurrentLocationSearch(event);
  }
});
    
  }
  function bindGlobalEvents() {
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      document.body.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
    });
    document.getElementById('drawer-scrim')?.addEventListener('click', closeDrawer);
    document.getElementById('language-switcher')?.addEventListener('change', (event) => changeLanguage(event.target.value));
    document.getElementById('refresh-system')?.addEventListener('click', () => {
      if (state.activeView === 'dashboard') refreshDashboard();
      else refreshHealth();
    });
    document.addEventListener('click', (event) => {
      const routeButton = event.target.closest('[data-route]');
      if (routeButton) {
        event.preventDefault();
        navigate(routeButton.dataset.route);
        return;
      }
      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      if (action === 'refresh-dashboard') refreshDashboard();
      else if (action === 'refresh-weather') refreshWeather();
      else if (action === 'refresh-history') refreshHistory();
      else if (action === 'check-current-location') checkCurrentLocation();
      else if (action === 'search-location') {
  handleCurrentLocationSearch({
    preventDefault() {},
    currentTarget: actionButton.closest('form')
  });
}
  
  

else if (action === 'select-location') {
  const index = Number(actionButton.dataset.locationIndex);
  selectSearchedLocation(index);
}
      else if (action === 'refresh-health') refreshHealth();
      

      else if (action === 'reload-profile') reloadProfile();
      else if (action === 'go-farm') navigate('farm');
      else if (action === 'request-notifications') requestNotificationPermission();
      else if (action === 'remove-image') removeImage();
      else if (action === 'speak-disease') speak(actionButton.dataset.speech || '');
 else if (action === 'translate-disease') {
  const diseaseCard = actionButton.closest('.disease-analysis');

  const diagnosis = diseaseCard?.querySelector('.diagnosis strong');

  if (!diagnosis) return;

 const diseaseText = diagnosis.textContent.trim().replace(/_/g, ' ');

  const targetLanguage =
    actionButton.dataset.targetLanguage || 'te';

  const translationBox =
    diseaseCard.querySelector('.translation-result');

  if (!translationBox) return;

  // English: show the original disease name
  if (targetLanguage === 'en') {
    translationBox.innerHTML = `
      <h3>Translation</h3>
      <div>${escapeHtml(diseaseText)}</div>
    `;
    return;
  }

  // Disable all translation buttons while translating
  const translationButtons =
    diseaseCard.querySelectorAll(
      '[data-action="translate-disease"]'
    );

  translationButtons.forEach((button) => {
    button.disabled = true;
  });

  translationBox.innerHTML = `
    <p>Translating...</p>
  `;

  api.translateDisease({
    text: diseaseText,
    targetLanguage: targetLanguage
  })
    .then((response) => {
  const result =
    response?.data ||
    response?.result ||
    response;

  if (!result?.translatedText) {
    throw new Error('Translation failed');
  }

  translationBox.innerHTML = `
    <h3>Translation</h3>
    <div>${escapeHtml(result.translatedText)}</div>
  `;
})
    .catch((error) => {
      console.error('Translation error:', error);

      translationBox.innerHTML = `
        <h3>Translation</h3>
        <div>Translation failed. Please try again.</div>
      `;
    })
    .finally(() => {
      translationButtons.forEach((button) => {
        button.disabled = false;
      });
    });
}
      else if (action === 'clear-history-search') {
        const input = document.getElementById('history-search');
        if (input) { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); }
      }
    });
    document.addEventListener('click', (event) => {
      const speakButton = event.target.closest('[data-speak-index]');
      if (!speakButton) return;
      const message = state.copilotMessages[Number(speakButton.dataset.speakIndex)];
      if (message?.text) speak(message.text);
    });
    window.addEventListener('hashchange', () => {
      state.activeView = routeFromHash();
      closeDrawer(); renderView(); loadForView();
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDrawer();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }
    });
    window.addEventListener('offline', () => toast(t('browserOffline'), 'error'));
    window.addEventListener('online', () => toast(t('browserOnline'), 'success'));
  }

  async function changeLanguage(language) {
    if (!['en', 'te', 'hi'].includes(language) || language === state.lang) return;
    state.lang = language;
    safeSetStorage('agrisaathi-language', language);
    updateStaticText(); renderView();
    toast(t('languageSavedDevice'), 'success');
    if (state.profile) {
      try {
        const response = await api.updateProfileLanguage({ preferredLanguage: language });
        const updated = response?.profile ?? response;
        if (updated && typeof updated === 'object') state.profile = { ...state.profile, ...updated };
      } catch (_) {
        toast(t('languageSyncFailed'), 'error');
      }
    }
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    if (!window.location.hash) history.replaceState(null, '', '#dashboard');
    state.activeView = routeFromHash();
    updateStaticText();
    renderNavigation();
    updateFarmSummary();
    updateConnectionIndicator();
    bindGlobalEvents();
    renderView();
    loadForView();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
