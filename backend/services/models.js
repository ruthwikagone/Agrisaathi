const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const config = require('../config');
const { AppError } = require('../errors');

const root = config.rootDir;

const cropScript = path.join(root, 'ml', 'inference', 'crop_predict.py');
const cropArtifact = path.join(root, 'ml', 'models', 'crop_model.joblib');
const cropMetadata = path.join(root, 'ml', 'models', 'crop_model_metadata.json');

const diseaseScript = path.join(root, 'ml', 'inference', 'disease_predict.py');
const diseaseArtifact = path.join(root, 'ml', 'models', 'disease_model.keras');
const diseaseMetadata = path.join(root, 'ml', 'models', 'disease_model_metadata.json');

const DISEASE_AI_URL = 'http://agrisaathi-disease-ai.onrender.com';

const VALID_CROPS = new Set([
  'rice',
  'chilli',
  'maize',
  'groundnut',
  'cotton'
]);
const CROP_ALIASES = {
  'వరి': 'rice',
  'బియ్యం': 'rice',
  'మిరప': 'chilli',
  'మిరపకాయ': 'chilli',
  'మొక్కజొన్న': 'maize',
  'వేరుశెనగ': 'groundnut',
  'పత్తి': 'cotton'
};

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function inspectArtifact({ script, artifact, metadata, framework }) {
  const scriptAvailable = fs.existsSync(script);
  const artifactPresent = fs.existsSync(artifact);
  const metadataPresent = fs.existsSync(metadata);

  let parsedMetadata = null;
  let metadataError = null;
  let artifactIntegrity = null;

  if (metadataPresent) {
    try {
      parsedMetadata = JSON.parse(fs.readFileSync(metadata, 'utf8'));
    } catch {
      metadataError = 'Metadata is not valid JSON.';
    }
  }

  if (artifactPresent && parsedMetadata) {
    const expected = parsedMetadata.artifact_sha256;

    if (
      typeof expected === 'string' &&
      /^[a-f0-9]{64}$/i.test(expected)
    ) {
      artifactIntegrity =
        sha256File(artifact).toLowerCase() === expected.toLowerCase();
    } else {
      metadataError =
        'Metadata does not contain a valid artifact checksum.';
    }
  }

  return {
    status:
      scriptAvailable &&
      artifactPresent &&
      metadataPresent &&
      artifactIntegrity === true
        ? 'available'
        : 'unavailable',

    scriptAvailable,
    artifactPresent,
    metadataPresent,
    artifactIntegrity,

    modelLoaded: false,

    artifact: path.relative(root, artifact),
    metadata: path.relative(root, metadata),

    framework,

    modelVersion: parsedMetadata?.model_version || null,

    classes: Array.isArray(parsedMetadata?.classes)
      ? parsedMetadata.classes
      : null,

    ...(metadataError ? { metadataError } : {})
  };
}

function modelHealth() {
  const crop = inspectArtifact({
    script: cropScript,
    artifact: cropArtifact,
    metadata: cropMetadata,
    framework: 'scikit-learn'
  });

  const disease = {
    status: 'available',
    service: DISEASE_AI_URL,
    models: [
      'rice',
      'chilli',
      'maize',
      'groundnut',
      'cotton'
    ],
    framework: 'TensorFlow/Keras',
    modelLoaded: true
  };

  return {
    status:
      crop.status === 'available' || disease.status === 'available'
        ? 'partially_available'
        : 'unavailable',

    crop,
    disease,

    device:
      'Disease models are loaded by the local Python AI service.'
  };
}

function runInference(
  script,
  input,
  unavailableCode,
  unavailableMessage
) {
  if (!fs.existsSync(script)) {
    throw new AppError(
      503,
      unavailableCode,
      unavailableMessage
    );
  }

  const result = spawnSync(
    config.pythonBin,
    [
      script,
      '--input-json',
      JSON.stringify(input)
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024
    }
  );

  if (result.error) {
    throw new AppError(
      503,
      unavailableCode,
      unavailableMessage,
      {
        reason: result.error.message
      }
    );
  }

  const output = result.stdout?.trim();

  let parsed;

  try {
    parsed = JSON.parse(output);
  } catch {
    throw new AppError(
      503,
      unavailableCode,
      unavailableMessage,
      {
        processStatus: result.status,
        stderr: (result.stderr || '').slice(0, 500)
      }
    );
  }

  if (!parsed.ok) {
    throw new AppError(
      503,
      parsed.error?.code || unavailableCode,
      parsed.error?.message || unavailableMessage,
      parsed.error?.details
    );
  }

  return parsed;
}

function cropPredict(input) {
  return runInference(
    cropScript,
    input,
    'CROP_MODEL_UNAVAILABLE',
    'Crop recommendation model is currently unavailable. Train and export the documented model first.'
  );
}

async function diseasePredict(input) {
  const cropInput = String(input.crop || '').trim().toLowerCase();
    const crop = CROP_ALIASES[cropInput] || cropInput;

  if (!VALID_CROPS.has(crop)) {
    throw new AppError(
      400,
      'INVALID_CROP',
      'Unsupported crop. Choose rice, chilli, maize, groundnut, or cotton.'
    );
  }

  if (!input.imagePath) {
    throw new AppError(
      400,
      'IMAGE_REQUIRED',
      'Disease analysis requires an image.'
    );
  }

  if (!fs.existsSync(input.imagePath)) {
    throw new AppError(
      400,
      'IMAGE_NOT_FOUND',
      'The uploaded disease image could not be found.'
    );
  }

  try {
    const imageBuffer = fs.readFileSync(input.imagePath);

    const form = new FormData();

    form.append(
      'image',
      new Blob(
        [imageBuffer],
        {
          type: input.mimeType || 'image/jpeg'
        }
      ),
      path.basename(input.imagePath)
    );

    form.append('crop', crop);

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      30_000
    );

    let response;

    try {
      response = await fetch(
        `${DISEASE_AI_URL}/predict`,
        {
          method: 'POST',
          body: form,
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new AppError(
        503,
        'DISEASE_AI_INVALID_RESPONSE',
        'Disease AI service returned an invalid response.'
      );
    }

    if (!response.ok || !data.ok) {
      throw new AppError(
        503,
        data.error?.code || 'DISEASE_AI_ERROR',
        data.error?.message ||
          'Disease AI service failed to analyze the image.',
        data.error?.details
      );
    }

    return {
      ok: true,

      crop,

      prediction: data.disease,

      confidence: data.confidence,

      modelVersion:
        data.modelVersion ||
        `agrisaathi-${crop}-disease-v1`,

      service: 'AgriSaathi Disease AI'
    };

  } catch (error) {

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      503,
      'DISEASE_AI_UNAVAILABLE',
      'AgriSaathi Disease AI service is unavailable. Start the Python inference server on port 5001.',
      {
        reason: error.name === 'AbortError'
          ? 'AI request timed out.'
          : error.message
      }
    );
  }
}

module.exports = {
  modelHealth,
  cropPredict,
  diseasePredict
};
