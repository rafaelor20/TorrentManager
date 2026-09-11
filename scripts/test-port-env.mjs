import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = process.cwd();
const TEST_ENV_PATH = path.join(ROOT_DIR, '.env.test');

// Import compiled ConfigService
async function testConfigService() {
  console.log('--- Starting Default Port and .env File Tests ---');

  // Clear previous environment variables
  delete process.env.PORT;
  delete process.env.SERVER_PORT;
  delete process.env.APP_PORT;
  delete process.env.TORRENT_MANAGER_PORT;
  delete process.env.ENV_FILE;
  delete process.env.ENV_PATH;

  // Load compiled module
  const { ConfigService, DEFAULT_CONFIG } = await import('../dist/infra/config/ConfigService.js');

  // 1. Test default port without .env (should be 3000)
  assert.strictEqual(DEFAULT_CONFIG.server.port, 3000, 'DEFAULT_CONFIG must have port 3000');
  
  // Clear cache
  ConfigService.cachedConfig = null;
  ConfigService.envCarregado = false;
  ConfigService.loadedEnvPath = null;
  
  const configPadrao = ConfigService.carregar();
  assert.strictEqual(configPadrao.server.port, 3000, 'Default loaded port must be 3000');
  console.log('✓ Test 1: Default port 3000 verified successfully!');

  // 2. Test loading with .env file containing PORT=4500
  try {
    fs.writeFileSync(TEST_ENV_PATH, 'PORT=4500\nQBIT_USER=usuario_env\n', 'utf-8');
    
    // Force reload
    ConfigService.cachedConfig = null;
    ConfigService.envCarregado = false;
    ConfigService.loadedEnvPath = null;
    
    ConfigService.carregarEnv(TEST_ENV_PATH);
    const configComEnv = ConfigService.carregar();
    
    assert.strictEqual(configComEnv.server.port, 4500, '.env port must be 4500');
    assert.strictEqual(process.env.PORT, '4500', 'process.env.PORT must be "4500"');
    console.log('✓ Test 2: Port 4500 loaded from .env file successfully!');

  // 3. Test format with quotes and comments: PORT="8080" # custom port
    fs.writeFileSync(TEST_ENV_PATH, 'PORT="8080" # porta web\n', 'utf-8');
    ConfigService.cachedConfig = null;
    ConfigService.envCarregado = false;
    ConfigService.loadedEnvPath = null;
    delete process.env.PORT;

    ConfigService.carregarEnv(TEST_ENV_PATH);
    const configAspas = ConfigService.carregar();
    assert.strictEqual(configAspas.server.port, 8080, 'Port with quotes must be 8080');
    console.log('✓ Test 3: Port with quotes and comments ("8080") parsed successfully!');

    // 4. Test safe fallback with invalid value
    fs.writeFileSync(TEST_ENV_PATH, 'PORT=invalida\n', 'utf-8');
    ConfigService.cachedConfig = null;
    ConfigService.envCarregado = false;
    ConfigService.loadedEnvPath = null;
    delete process.env.PORT;

    ConfigService.carregarEnv(TEST_ENV_PATH);
    const configInvalida = ConfigService.carregar();
    assert.strictEqual(configInvalida.server.port, 3000, 'Invalid port must safely fallback to 3000');
    console.log('✓ Test 4: Resilient fallback to 3000 verified for invalid value!');

  } finally {
    if (fs.existsSync(TEST_ENV_PATH)) {
      fs.unlinkSync(TEST_ENV_PATH);
    }
  }

  console.log('\n========================================================');
  console.log('✓ ALL PORT AND .ENV TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

testConfigService().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
