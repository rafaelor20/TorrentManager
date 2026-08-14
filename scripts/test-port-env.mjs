import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = process.cwd();
const TEST_ENV_PATH = path.join(ROOT_DIR, '.env.test');

// Importa ConfigService compilado
async function testConfigService() {
  console.log('--- Iniciando Testes de Porta Padrão e Arquivo .env ---');

  // Limpa variáveis de ambiente prévias
  delete process.env.PORT;
  delete process.env.SERVER_PORT;
  delete process.env.APP_PORT;
  delete process.env.TORRENT_MANAGER_PORT;
  delete process.env.ENV_FILE;
  delete process.env.ENV_PATH;

  // Carrega módulo compilado
  const { ConfigService, DEFAULT_CONFIG } = await import('../dist/infra/config/ConfigService.js');

  // 1. Testa porta padrão sem .env (deve ser 3000)
  assert.strictEqual(DEFAULT_CONFIG.server.port, 3000, 'DEFAULT_CONFIG deve ter porta 3000');
  
  // Limpa cache
  ConfigService.cachedConfig = null;
  ConfigService.envCarregado = false;
  ConfigService.loadedEnvPath = null;
  
  const configPadrao = ConfigService.carregar();
  assert.strictEqual(configPadrao.server.port, 3000, 'Porta padrão carregada deve ser 3000');
  console.log('✓ Teste 1: Porta padrão 3000 verificada com sucesso!');

  // 2. Testa carregamento com arquivo .env contendo PORT=4500
  try {
    fs.writeFileSync(TEST_ENV_PATH, 'PORT=4500\nQBIT_USER=usuario_env\n', 'utf-8');
    
    // Força recarregamento
    ConfigService.cachedConfig = null;
    ConfigService.envCarregado = false;
    ConfigService.loadedEnvPath = null;
    
    ConfigService.carregarEnv(TEST_ENV_PATH);
    const configComEnv = ConfigService.carregar();
    
    assert.strictEqual(configComEnv.server.port, 4500, 'Porta do .env deve ser 4500');
    assert.strictEqual(process.env.PORT, '4500', 'process.env.PORT deve ser "4500"');
    console.log('✓ Teste 2: Porta 4500 carregada do arquivo .env com sucesso!');

    // 3. Testa formato com aspas e comentários: PORT="8080" # porta custom
    fs.writeFileSync(TEST_ENV_PATH, 'PORT="8080" # porta web\n', 'utf-8');
    ConfigService.cachedConfig = null;
    ConfigService.envCarregado = false;
    ConfigService.loadedEnvPath = null;
    delete process.env.PORT;

    ConfigService.carregarEnv(TEST_ENV_PATH);
    const configAspas = ConfigService.carregar();
    assert.strictEqual(configAspas.server.port, 8080, 'Porta com aspas deve ser 8080');
    console.log('✓ Teste 3: Porta com aspas e comentários ("8080") parseada com sucesso!');

    // 4. Testa fallback seguro com valor inválido
    fs.writeFileSync(TEST_ENV_PATH, 'PORT=invalida\n', 'utf-8');
    ConfigService.cachedConfig = null;
    ConfigService.envCarregado = false;
    ConfigService.loadedEnvPath = null;
    delete process.env.PORT;

    ConfigService.carregarEnv(TEST_ENV_PATH);
    const configInvalida = ConfigService.carregar();
    assert.strictEqual(configInvalida.server.port, 3000, 'Porta inválida deve fazer fallback seguro para 3000');
    console.log('✓ Teste 4: Fallback resiliente para 3000 em caso de valor inválido verificado!');

  } finally {
    if (fs.existsSync(TEST_ENV_PATH)) {
      fs.unlinkSync(TEST_ENV_PATH);
    }
  }

  console.log('\n========================================================');
  console.log('✓ TODOS OS TESTES DE PORTA E .ENV PASSARAM COM SUCESSO!');
  console.log('========================================================\n');
}

testConfigService().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
