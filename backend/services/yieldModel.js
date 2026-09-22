const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

const pythonScript = path.join(
  projectRoot,
  'ml',
  'predict_yield.py'
);

function predictYield(input) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [pythonScript], {
      cwd: projectRoot,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('error', (error) => {
      reject(new Error(`Could not start Python: ${error.message}`));
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Yield model failed: ${stderr || stdout || `exit code ${code}`}`
          )
        );
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());

        if (result.error) {
          reject(new Error(result.error));
          return;
        }

        resolve(result);
      } catch (error) {
        reject(
          new Error(
            `Invalid response from yield model: ${stdout}`
          )
        );
      }
    });

    python.stdin.write(JSON.stringify(input));
    python.stdin.end();
  });
}

module.exports = { predictYield };