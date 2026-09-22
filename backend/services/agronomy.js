function buildWeatherAlerts(weather) {
  const today = weather.daily?.[0];
  const current = weather.current || {};
  const alerts = [];

  if (
    (today?.rainProbability ?? 0) >= 70 ||
    (today?.rainfall ?? 0) >= 20
  ) {
    alerts.push({
      key: `rain-${today?.date || current.observedAt}`,
      severity: (today?.rainfall ?? 0) >= 50 ? 'high' : 'medium',
      type: 'Rainfall risk',
      time: today?.date || current.observedAt,
      expectedCondition:
        `${today?.rainProbability ?? 'Unknown'}% rain probability; ` +
        `${today?.rainfall ?? 'Unknown'} mm forecast`,
      action:
        'Avoid non-essential irrigation and delay spraying if rain is imminent. ' +
        'Check drainage and protect harvested produce.',
      basis: 'Current Open-Meteo forecast'
    });
  }

  if (
    (today?.temperatureMax ??
      current.temperature ??
      -Infinity) >= 38
  ) {
    alerts.push({
      key: `heat-${today?.date || current.observedAt}`,
      severity: 'medium',
      type: 'Heat stress risk',
      time: today?.date || current.observedAt,
      expectedCondition:
        `${today?.temperatureMax ?? current.temperature}°C maximum/current temperature`,
      action:
        'Check soil moisture early, reduce heat stress where practical, ' +
        'and avoid spraying during the hottest period.',
      basis: 'Current Open-Meteo forecast'
    });
  }

  if (
    (today?.windSpeedMax ??
      current.windSpeed ??
      -Infinity) >= 30
  ) {
    alerts.push({
      key: `wind-${today?.date || current.observedAt}`,
      severity: 'medium',
      type: 'Strong wind risk',
      time: today?.date || current.observedAt,
      expectedCondition:
        `${today?.windSpeedMax ?? current.windSpeed} km/h wind`,
      action:
        'Avoid spraying while wind creates drift risk. ' +
        'Secure covers and inspect supported crops.',
      basis: 'Current Open-Meteo forecast'
    });
  }

  return alerts;
}


function buildFarmPlan(profile, weather) {
  const current = weather.current || {};
  const today = weather.daily?.[0] || {};
  const actions = [];

  if ((today.rainProbability ?? 0) >= 60) {
    actions.push({
      priority: 'high',
      action: 'Delay routine irrigation',
      reason:
        `${today.rainProbability}% rain probability is forecast today.`,
      source: 'Live weather'
    });
  } else {
    actions.push({
      priority: 'medium',
      action: 'Check soil moisture before irrigating',
      reason:
        'No high-rain signal is present; actual soil moisture has not been measured by this system.',
      source: 'Live weather + missing soil sensor'
    });
  }

  if ((current.windSpeed ?? 0) >= 20) {
    actions.push({
      priority: 'high',
      action: 'Avoid spraying in current wind',
      reason:
        `Wind is ${current.windSpeed} km/h, which can increase drift risk.`,
      source: 'Live weather'
    });
  } else if ((today.rainProbability ?? 0) >= 50) {
    actions.push({
      priority: 'medium',
      action: 'Check the forecast before spraying',
      reason:
        `${today.rainProbability}% rain probability can reduce application effectiveness.`,
      source: 'Live weather'
    });
  }

  if ((current.temperature ?? 0) >= 35) {
    actions.push({
      priority: 'medium',
      action: 'Inspect crop for heat and water stress',
      reason:
        `Current temperature is ${current.temperature}°C.`,
      source: 'Live weather'
    });
  }

  if (profile?.currentCrop) {
    actions.push({
      priority: 'low',
      action: `Walk the ${profile.currentCrop} field`,
      reason:
        'No field observation or disease image has been recorded today.',
      source: 'Farm profile + history'
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    crop: profile?.currentCrop || null,
    weather,
    actions
  };
}


/*
 * Irrigation Advisor
 *
 * Uses:
 * - Current crop
 * - Crop stage
 * - Soil type
 * - Soil moisture when supplied
 * - Live rain probability
 * - Live expected rainfall
 * - Temperature
 * - Humidity
 * - Water source
 *
 * This is decision support only.
 * It does not calculate exact litres or irrigation duration.
 */
function irrigationAdvice(input, weather) {
  const today = weather.daily?.[0] || {};
  const current = weather.current || {};

  const rainProbability = Number(today.rainProbability);
  const rainfall = Number(today.rainfall);
  const temperature = Number(current.temperature);
  const humidity = Number(current.humidity);
  const moisture = Number(input.soilMoisture);

  const crop =
    input.currentCrop ||
    input.crop ||
    'current crop';

  const stage =
    input.cropStage ||
    input.growthStage ||
    null;

  const soilType =
    input.soilType ||
    null;

  const waterSource =
    input.waterSource ||
    null;

  const hasRainProbability =
    Number.isFinite(rainProbability);

  const hasRainfall =
    Number.isFinite(rainfall);

  const hasMoisture =
    Number.isFinite(moisture);

  const hasTemperature =
    Number.isFinite(temperature);

  const hasHumidity =
    Number.isFinite(humidity);

  /*
   * Rain should not be judged using probability alone.
   *
   * We consider:
   * - >= 10 mm expected rainfall
   * OR
   * - >= 70% probability AND >= 5 mm expected rainfall
   */
  const usefulRainExpected =
    (hasRainfall && rainfall >= 10) ||
    (
      hasRainProbability &&
      rainProbability >= 70 &&
      hasRainfall &&
      rainfall >= 5
    );

  /*
   * Soil moisture below 25% is treated as
   * a reported low-moisture signal.
   *
   * This is NOT an exact agricultural threshold.
   * It is only used as a decision-support signal.
   */
  const reportedLowMoisture =
    hasMoisture && moisture < 25;

  let decision = 'Monitor soil moisture';

  const reasons = [];

  /*
   * FIELD MOISTURE HAS PRIORITY.
   *
   * If farmer reports low moisture, don't blindly
   * override that information just because rain is forecast.
   */
  if (reportedLowMoisture) {
    if (usefulRainExpected) {
      decision = 'Monitor closely before irrigating';

      reasons.push(
        `Reported soil moisture is ${moisture}%, while the forecast indicates possible useful rainfall. ` +
        'Recheck field moisture after the rainfall before irrigating.'
      );
    } else {
      decision = 'Irrigation assessment needed now';

      reasons.push(
        `Reported soil moisture is ${moisture}%. ` +
        'No sufficiently strong rainfall signal is available to rely on for replenishing soil moisture.'
      );
    }
  }

  /*
   * No low-moisture signal.
   *
   * If useful rainfall is expected, routine irrigation
   * can normally be delayed.
   */
  else if (usefulRainExpected) {
    decision = 'Irrigation can be delayed';

    reasons.push(
      `The forecast indicates ${rainProbability}% rain probability ` +
      `and approximately ${rainfall} mm expected rainfall today.`
    );
  }

  /*
   * No strong rain and no reported low moisture.
   */
  else {
    decision = 'Monitor soil moisture';

    reasons.push(
      'No sufficiently strong rainfall signal or reported low-soil-moisture reading is available.'
    );

    reasons.push(
      'Check moisture in the crop root zone before deciding whether irrigation is needed.'
    );
  }

  /*
   * Crop and growth-stage context.
   */
  if (stage) {
    reasons.push(
      `Crop: ${crop}; growth stage: ${stage}.`
    );
  } else {
    reasons.push(
      `Crop: ${crop}. Crop growth stage was not supplied.`
    );
  }

  /*
   * Soil context.
   */
  if (soilType) {
    reasons.push(
      `Soil type supplied: ${soilType}.`
    );
  }

  /*
   * Temperature context.
   */
  if (hasTemperature) {
    reasons.push(
      `Current temperature is ${temperature}°C.`
    );
  }

  /*
   * Humidity context.
   */
  if (hasHumidity) {
    reasons.push(
      `Current humidity is ${humidity}%.`
    );
  }

  /*
   * Water-source context.
   */
  if (waterSource) {
    reasons.push(
      `Water source supplied: ${waterSource}.`
    );
  }

  return {
    decision,

    reasons,

    weatherBasis: {
      observedAt:
        current.observedAt || null,

      rainProbability:
        hasRainProbability
          ? rainProbability
          : null,

      rainfall:
        hasRainfall
          ? rainfall
          : null,

      temperature:
        hasTemperature
          ? temperature
          : null,

      humidity:
        hasHumidity
          ? humidity
          : null
    },

    inputsUsed: {
      crop,
      cropStage: stage,
      soilType,

      soilMoisture:
        hasMoisture
          ? moisture
          : null,

      waterSource
    },

    disclaimer:
      'This is a rule-based irrigation decision-support tool. ' +
      'It does not calculate exact water volume or irrigation duration. ' +
      'Use field soil-moisture observations and locally recommended ' +
      'crop-stage irrigation guidance for final scheduling.'
  };
}

function fertilizerAdvice(input) {
  const crop = String(input.crop || '').trim().toLowerCase();
  const stage = String(input.growthStage || '').trim().toLowerCase();

  const recommendations = {
   cotton: {
  flowering: {
    title: 'Cotton — Flowering stage',

    recommendation:
      'At flowering, continue the planned nitrogen application. Do not apply extra urea or DAP beyond the recommended crop schedule.',

    action:
      'For irrigated cotton, the ICAR advisory gives a seasonal target of 150:75:75 kg N:P₂O₅:K₂O per hectare, with nitrogen split across crop stages. At flowering, apply only the nitrogen portion scheduled for this stage.',

    rate:
      'Irrigated cotton: 150:75:75 kg N:P₂O₅:K₂O per hectare for the season. Rainfed cotton: 120:60:60 kg N:P₂O₅:K₂O per hectare.',

    timing:
      'Nitrogen should be split rather than applied all at once. The exact split depends on whether the crop is rainfed or irrigated.',

    avoid:
      'Avoid excessive urea or DAP. Use soil-test results when available.',

    note:
      'Recommendation based on ICAR Kharif Agro-Advisory 2025 and Telangana balanced-fertilization guidance from ICAR-CRIDA.'
  },

  vegetative: {
    title: 'Cotton — Vegetative stage',

    recommendation:
      'Use the scheduled nitrogen application for the vegetative stage and maintain balanced NPK nutrition.',

    action:
      'Do not apply the entire nitrogen requirement at once. Follow the crop-stage fertilizer schedule for your cotton variety.',

    rate:
      'ICAR seasonal reference: irrigated 150:75:75 kg N:P₂O₅:K₂O/ha; rainfed 120:60:60 kg/ha.',

    timing:
      'Apply nitrogen in split doses according to crop stage.',

    avoid:
      'Avoid unnecessary extra urea or DAP without soil-test or crop-stage justification.',

    note:
      'Soil-test-based balanced fertilization is preferred.'
  },

  default: {
    title: 'Cotton — Fertilizer recommendation',

    recommendation:
      'Cotton needs balanced nitrogen, phosphorus and potassium. The correct dose depends on whether the crop is irrigated or rainfed and on the growth stage.',

    action:
      'Select the crop growth stage to receive a stage-specific recommendation. Use soil-test results whenever available.',

    rate:
      'ICAR reference: irrigated cotton 150:75:75 kg N:P₂O₅:K₂O/ha; rainfed cotton 120:60:60 kg/ha.',

    timing:
      'Nitrogen should be divided across crop stages rather than applied as one large dose.',

    avoid:
      'Avoid excessive urea or DAP.',

    note:
      'ICAR-CRIDA Telangana guidance emphasizes soil-test-based balanced fertilization.'
  }
},
    rice: {
  flowering: {
    title: 'Rice — Flowering stage',

    recommendation:
      'Rice needs balanced nitrogen, phosphorus and potassium. Fertilizer application should follow the crop stage and soil-test recommendation.',

    action:
      'A PJTSAU reference programme uses 120:60:40 kg N:P₂O₅:K₂O per hectare. Nitrogen is applied in split doses rather than all at once.',

    rate:
      '120:60:40 kg N:P₂O₅:K₂O per hectare.',

    timing:
      'Reference schedule: nitrogen in three splits at basal, 60 DAS and 90 DAS; phosphorus and potassium were applied basally in the referenced study.',

    avoid:
      'Avoid excessive urea or applying the full nitrogen dose at one time.',

    note:
      'PJTSAU rice research reference; soil-test-based adjustment is preferred.'
  },

  default: {
    title: 'Rice — Fertilizer recommendation',

    recommendation:
      'Use balanced NPK nutrition according to rice growth stage, variety and soil condition.',

    action:
      'Use 120:60:40 kg N:P₂O₅:K₂O per hectare as the referenced PJTSAU programme and split nitrogen across crop stages.',

    rate:
      '120:60:40 kg N:P₂O₅:K₂O per hectare.',

    timing:
      'Reference schedule: nitrogen in split applications; phosphorus and potassium mainly as basal application.',

    avoid:
      'Do not apply excessive nitrogen or increase the dose without soil-test or crop-specific justification.',

    note:
      'PJTSAU rice research reference.'
  }
},

   maize: {
  flowering: {
    title: 'Maize — Flowering stage',
    recommendation:
      'Maize needs balanced nitrogen, phosphorus and potassium. At flowering, apply only the nitrogen portion scheduled for this crop stage.',

    action:
      'ICAR reference dose is 120:60:40 kg N:P₂O₅:K₂O per hectare. Nitrogen is divided across crop stages rather than applied all at once.',

    rate:
      '120:60:40 kg N:P₂O₅:K₂O per hectare for the season.',

    timing:
      'Apply nitrogen in split doses according to crop stage, including the tasselling/flowering stage.',

    avoid:
      'Do not apply the entire nitrogen requirement at once.',

    note:
      'ICAR Kharif Agro-Advisory 2025.'
  },

  default: {
    title: 'Maize — Fertilizer recommendation',

    recommendation:
      'Use balanced NPK nutrition according to the maize growth stage.',

    action:
      'Use 120:60:40 kg N:P₂O₅:K₂O per hectare as the ICAR reference programme and split nitrogen across crop stages.',

    rate:
      '120:60:40 kg N:P₂O₅:K₂O per hectare.',

    timing:
      'Nitrogen should be applied in split doses according to crop stage.',

    avoid:
      'Avoid applying the complete nitrogen dose at one time.',

    note:
      'ICAR Kharif Agro-Advisory 2025.'
  }
},

chilli: {
  flowering: {
    title: 'Chilli — Flowering stage',

    recommendation:
      'Chilli requires balanced nutrition during flowering and fruit development.',

    action:
      'For irrigated chilli, use the recommended 150:75:75 kg N:P₂O₅:K₂O per hectare programme. For rainfed chilli, the reference is 100:50:50 kg/ha.',

    rate:
      'Irrigated: 150:75:75 kg N:P₂O₅:K₂O/ha. Rainfed: 100:50:50 kg/ha.',

    timing:
      'Apply fertilizer according to crop stage and whether the crop is irrigated or rainfed.',

    avoid:
      'Avoid excessive nitrogen during flowering.',

    note:
      'ICAR Kharif Agro-Advisory 2025.'
  },

  default: {
    title: 'Chilli — Fertilizer recommendation',

    recommendation:
      'Maintain balanced NPK nutrition throughout chilli growth and flowering.',

    action:
      'For irrigated chilli, the ICAR reference is 150:75:75 kg N:P₂O₅:K₂O per hectare. For rainfed chilli, it is 100:50:50 kg/ha.',

    rate:
      'Irrigated: 150:75:75 kg N:P₂O₅:K₂O/ha. Rainfed: 100:50:50 kg/ha.',

    timing:
      'Apply fertilizer according to crop stage and production system.',

    avoid:
      'Do not increase nitrogen beyond the recommended programme without soil-test or agronomic justification.',

    note:
      'ICAR Kharif Agro-Advisory 2025.'
  }
},

tomato: {
  flowering: {
    title: 'Tomato — Flowering stage',

    recommendation:
      'Tomato needs balanced nutrition during flowering and fruit development.',

    action:
      'The fertilizer programme depends on whether the crop is a hybrid or variety. ICAR lists 250:250:250 kg N:P₂O₅:K₂O/ha for hybrids and 115:100:60 kg/ha for varieties.',

    rate:
      'Hybrid: 250:250:250 kg N:P₂O₅:K₂O/ha. Variety: 115:100:60 kg/ha.',

    timing:
      'Apply fertilizer according to the crop stage and the specific hybrid or variety programme.',

    avoid:
      'Do not use the hybrid rate automatically for a non-hybrid variety.',

    note:
      'ICAR Kharif Agro-Advisory 2025.'
  },

  default: {
    title: 'Tomato — Fertilizer recommendation',

    recommendation:
      'Tomato requires balanced nutrition throughout vegetative growth, flowering and fruit development.',

    action:
      'Use the fertilizer programme appropriate for the tomato hybrid or variety being cultivated.',

    rate:
      'Hybrid: 250:250:250 kg N:P₂O₅:K₂O/ha. Variety: 115:100:60 kg/ha.',

    timing:
      'Apply nutrients according to crop stage and production system.',

    avoid:
      'Avoid applying fertilizer without considering the crop type and soil condition.',

    note:
      'ICAR Kharif Agro-Advisory 2025.'
  }
},

groundnut: {
  flowering: {
    title: 'Groundnut — Flowering stage',

    recommendation:
      'Groundnut requires balanced nutrient management, particularly around flowering and pod development.',

    action:
      'Use the locally recommended groundnut fertilizer programme and adjust it using soil-test information where available.',

    rate:
      'Fertilizer rates vary by region, season and soil. Do not use a single universal NPK rate for every groundnut field.',

    timing:
      'Nutrient management should follow the crop-stage recommendation for the production system.',

    avoid:
      'Avoid adding extra nitrogen simply because the crop appears weak without identifying the cause.',

    note:
      'ICAR recommends region-specific groundnut nutrient management; soil-test-based adjustment is preferred.'
  },

  default: {
    title: 'Groundnut — Fertilizer recommendation',

    recommendation:
      'Use balanced nutrition based on soil condition, season and the recommended groundnut production system.',

    action:
      'Follow the locally recommended groundnut fertilizer programme and use soil-test results where available.',

    rate:
      'Groundnut fertilizer requirements vary by region and production system, so a single universal rate is not used here.',

    timing:
      'Apply nutrients according to the recommended crop-stage schedule.',

    avoid:
      'Do not apply additional fertilizer based only on an assumed nutrient deficiency.',

    note:
      'ICAR crop advisories emphasize region-specific recommendations and balanced nutrient management.'
  }
},

  }
  const advice =
    recommendations[crop]?.[stage] ||
    recommendations[crop]?.default || {
      title: 'Fertilizer advice',
      recommendation:
        'Use a balanced fertilizer programme based on crop stage, soil condition and a soil-test recommendation where available.',
      action:
        'Follow the locally recommended fertilizer schedule for this crop. Do not apply additional fertilizer based only on assumed nutrient deficiency.',
      note:
        'Soil-test-based fertilizer management is preferred.'
    };

  const nutrientValues = [
    ['Nitrogen', input.nitrogen],
    ['Phosphorus', input.phosphorus],
    ['Potassium', input.potassium]
  ];

  const soilTest = nutrientValues.map(([name, value]) => ({
    nutrient: name,
    value:
      value !== undefined &&
      value !== null &&
      value !== '' &&
      Number.isFinite(Number(value))
        ? Number(value)
        : null
  }));

 return {
  crop: input.crop || null,
  growthStage: input.growthStage || null,

  recommendation: {
    title: advice.title,
    recommendation: advice.recommendation,
    action: advice.action,
    rate: advice.rate,
    timing: advice.timing,
    avoid: advice.avoid,
    note: advice.note
  },
  soilTest
};
}

  


function generalPestManagement(input) {
  const crop = String(input.crop || '').trim().toLowerCase();
  const problem = String(input.problem || '').trim().toLowerCase();

  const pestKey = problem.replace(/[_-]+/g, ' ');

  const guidance = {
    rice: {
      'stem borer': {
        what: 'Inspect rice plants for dead hearts, white ears and stem-borer damage.',
        why: 'Stem borers damage the stem and can cause dead hearts or white ears.',
        how: 'Scout multiple areas of the field, remove affected plants where practical, and use pheromone traps for monitoring.',
        when: 'Start monitoring early and continue through the crop period.'
      },
      'brown planthopper': {
        what: 'Check the lower portion of rice plants for brown planthopper colonies.',
        why: 'Brown planthoppers suck plant sap and can build up rapidly under favourable conditions.',
        how: 'Avoid unnecessary nitrogen, monitor the field regularly and conserve natural enemies. Consider treatment only when the population reaches the locally recommended threshold.',
        when: 'Monitor regularly, especially during humid conditions and dense crop growth.'
      },
      default: {
        what: 'Scout rice plants systematically for the reported pest and identify the pest before treatment.',
        why: 'Rice pests require different management approaches.',
        how: 'Inspect stems, leaves and the lower plant canopy and record the affected area and crop stage.',
        when: 'During regular field scouting.'
      }
    },

    maize: {
      'fall armyworm': {
        what: 'Inspect the maize whorl for feeding damage, frass and larvae.',
        why: 'Fall armyworm commonly damages the whorl and young maize leaves.',
        how: 'Scout plants regularly, use field sanitation and crop-management practices that reduce pest pressure, and consider biological or chemical control only when justified.',
        when: 'Start scouting from early crop growth and continue through the vulnerable stages.'
      },
      'stem borer': {
        what: 'Check maize stems and whorls for borer damage and dead-heart symptoms.',
        why: 'Stem borers can damage the growing point and internal stem tissues.',
        how: 'Remove severely affected plants where practical and maintain regular field scouting.',
        when: 'Monitor from early vegetative growth.'
      },
      default: {
        what: 'Inspect maize whorls, leaves and stems for the reported pest.',
        why: 'Maize pest management depends on the pest and crop stage.',
        how: 'Scout multiple plants and record the affected area before selecting a treatment.',
        when: 'During regular field scouting.'
      }
    },

    cotton: {
      'pink bollworm': {
        what: 'Inspect cotton flowers and bolls for pink bollworm symptoms and monitor adult activity.',
        why: 'Pink bollworm damages developing cotton bolls and is an important cotton pest.',
        how: 'Use pheromone-based monitoring and field scouting. Remove and destroy infested material where locally recommended and use integrated management rather than relying only on insecticides.',
        when: 'Pay particular attention from flowering through boll development.'
      },
      'whitefly': {
        what: 'Check the underside of cotton leaves for whiteflies and monitor population levels.',
        why: 'Whiteflies suck plant sap and can contribute to crop damage and disease transmission.',
        how: 'Monitor regularly, manage alternate hosts and weeds, conserve natural enemies and avoid unnecessary broad-spectrum insecticide use.',
        when: 'During vegetative growth and flowering.'
      },
      default: {
        what: 'Inspect cotton leaves, squares and bolls for the reported pest.',
        why: 'Cotton pest management changes substantially between sucking pests and bollworms.',
        how: 'Identify the pest and assess its population before selecting a treatment.',
        when: 'During regular scouting, especially from flowering onward.'
      }
    },

    chilli: {
      thrips: {
        what: 'Inspect young leaves and growing points for curling, silvering and thrips activity.',
        why: 'Thrips feed on tender plant tissue and can distort new growth.',
        how: 'Scout growing points regularly, remove heavily damaged material where practical and conserve beneficial insects.',
        when: 'Pay particular attention during early growth and flowering.'
      },
      aphids: {
        what: 'Check tender shoots and the underside of leaves for aphid colonies.',
        why: 'Aphids suck sap and can weaken new growth and contribute to virus transmission.',
        how: 'Monitor colonies and conserve natural enemies such as ladybird beetles and other predators.',
        when: 'During vegetative growth and flowering.'
      },
      default: {
        what: 'Inspect chilli leaves, shoots and flowers for the reported pest.',
        why: 'Chilli pest management depends on the pest and crop stage.',
        how: 'Check several plants and record where and how severely the crop is affected.',
        when: 'During regular field scouting.'
      }
    },

    tomato: {
      'fruit borer': {
        what: 'Inspect flowers and fruits for bore holes, feeding damage and caterpillars.',
        why: 'Fruit borers directly damage developing tomato fruits.',
        how: 'Remove and destroy severely damaged fruits, use regular scouting and consider pheromone-based monitoring as part of IPM.',
        when: 'Start monitoring from flowering and continue through fruit development.'
      },
      'leaf miner': {
        what: 'Inspect leaves for mines and larvae activity.',
        why: 'Leaf-mining insects damage the photosynthetic area of tomato plants.',
        how: 'Remove severely mined leaves where practical and monitor new growth for active infestation.',
        when: 'During vegetative growth and early fruit development.'
      },
      default: {
        what: 'Inspect tomato leaves, flowers and fruits for the reported pest.',
        why: 'Tomato pests require crop- and pest-specific management.',
        how: 'Identify the pest and assess the affected plants before selecting treatment.',
        when: 'During regular field scouting.'
      }
    },

    groundnut: {
      'leaf miner': {
        what: 'Inspect groundnut leaves for mines, blotches and larvae activity.',
        why: 'Leaf miners reduce healthy leaf area and can affect crop growth.',
        how: 'Scout affected leaves regularly and use integrated field management appropriate to the infestation level.',
        when: 'Monitor closely during active vegetative growth.'
      },
      'aphids': {
        what: 'Check young groundnut leaves and shoots for aphid colonies.',
        why: 'Aphids suck plant sap and may contribute to virus transmission.',
        how: 'Monitor colonies and conserve beneficial predators before considering chemical control.',
        when: 'During vegetative growth and flowering.'
      },
      default: {
        what: 'Inspect groundnut leaves, stems and growing points for the reported pest.',
        why: 'Groundnut pest management depends on the pest and infestation level.',
        how: 'Scout several parts of the field and document the affected area.',
        when: 'During regular field scouting.'
      }
    }
  };

  const cropGuidance = guidance[crop] || {};
  const selected =
    cropGuidance[pestKey] ||
    cropGuidance.default || {
      what: 'Inspect and identify the reported pest before choosing treatment.',
      why: 'Different crops and pests require different management approaches.',
      how: 'Check multiple plants, record crop stage and affected areas, and capture clear images if possible.',
      when: 'During regular field scouting.'
    };

  return {
    crop: input.crop || null,
    problem: input.problem || null,

    scope:
      'Crop- and pest-specific IPM guidance. This is not a diagnosis or pesticide-label recommendation.',

    recommendations: [
      {
        priority: 1,
        what: selected.what,
        why: selected.why,
        how: selected.how,
        when: selected.when
      },
      {
        priority: 2,
        what: 'Continue field monitoring',
        why: 'Early detection helps prevent pest populations from increasing.',
        how: 'Inspect multiple plants from different parts of the field and record changes.',
        when: 'Repeat monitoring regularly.'
      },
      {
        priority: 3,
        what: 'Prefer integrated pest management',
        why: 'Combining cultural, biological and chemical measures can reduce unnecessary pesticide use.',
        how: 'Use cultural and biological measures first where appropriate and protect beneficial organisms.',
        when: 'Before choosing chemical treatment.'
      }
    ],

    pesticideNotice:
      'No pesticide dosage is generated here. If chemical treatment is considered, verify that the product is legally registered for this crop and target pest and follow its current label.'
  };
}

module.exports = {
  buildWeatherAlerts,
  buildFarmPlan,
  irrigationAdvice,
  fertilizerAdvice,
  generalPestManagement
};