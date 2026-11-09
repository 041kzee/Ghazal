/**
 * Unified Test Runner for Ghazal Jewellery Backend.
 * Executes Product, Auth, and E-Commerce Lifecycle test suites sequentially.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const testSuites = [
  'tests/product.test.cjs',
  'tests/auth.test.cjs',
  'tests/ecommerce.test.cjs',
];

async function runSuite(suiteRelPath) {
  const fullPath = path.join(ROOT_DIR, suiteRelPath);
  console.log(`\n==================================================`);
  console.log(`RUNNING SUITE: ${suiteRelPath}`);
  console.log(`==================================================`);

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [fullPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test suite ${suiteRelPath} failed with exit code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  console.log('🚀 Starting Ghazal Jewellery Test Runner...');
  const startTime = Date.now();

  for (const suite of testSuites) {
    await runSuite(suite);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 ALL TEST SUITES PASSED CLEANLY in ${durationSec}s!`);
}

main().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILURE:', err.message);
  process.exit(1);
});

