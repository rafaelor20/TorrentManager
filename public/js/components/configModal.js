/**
 * Componente do Modal de Configurações e Formulário Rápido de Conexão
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { mostrarToast } from './toast.js';
import { atualizarStatusDiagnostico } from './diagnostics.js';
import { carregarTorrents } from './torrentsTable.js';

export function configurarAutoRefresh(segundos) {
  const infoAutoRefreshStatus = document.getElementById('infoAutoRefreshStatus');

  if (state.timerAutoRefresh) {
    clearInterval(state.timerAutoRefresh);
    state.timerAutoRefresh = null;
  }

  state.autoRefreshSegundos = Number(segundos) || 0;

  if (infoAutoRefreshStatus) {
    infoAutoRefreshStatus.textContent = state.autoRefreshSegundos > 0
      ? `A cada ${state.autoRefreshSegundos}s`
      : 'Desativado';
    infoAutoRefreshStatus.style.color = state.autoRefreshSegundos > 0 ? '#38bdf8' : '#94a3b8';
  }

  if (state.autoRefreshSegundos > 0) {
    state.timerAutoRefresh = setInterval(async () => {
      await carregarTorrents(false);
    }, state.autoRefreshSegundos * 1000);
  }
}

export async function abrirModalConfig() {
  const modalConfiguracoes = document.getElementById('modalConfiguracoes');
  const inputModalHost = document.getElementById('inputModalHost');
  const inputModalPort = document.getElementById('inputModalPort');
  const inputModalUsername = document.getElementById('inputModalUsername');
  const inputModalPassword = document.getElementById('inputModalPassword');
  const inputModalRefreshInterval = document.getElementById('inputModalRefreshInterval');
  const inputModalTimeout = document.getElementById('inputModalTimeout');
  const inputModalHttps = document.getElementById('inputModalHttps');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputUsername = document.getElementById('inputUsername');

  try {
    const data = await apiService.getConfig();

    if (data.config?.qbittorrent) {
      const qb = data.config.qbittorrent;
      if (inputModalHost) inputModalHost.value = qb.host || 'localhost';
      if (inputModalPort) inputModalPort.value = qb.port || 8877;
      if (inputModalUsername) inputModalUsername.value = qb.username || 'admin';
      if (inputModalRefreshInterval) inputModalRefreshInterval.value = qb.refreshInterval !== undefined ? qb.refreshInterval : 10;
      if (inputModalTimeout) inputModalTimeout.value = qb.timeoutMs || 5000;
      if (inputModalHttps) inputModalHttps.checked = Boolean(qb.useHttps);

      if (inputModalPassword) {
        inputModalPassword.value = '';
        inputModalPassword.placeholder = qb.hasPassword ? '•••••••• (senha salva)' : 'Digite a senha';
      }
    }
  } catch {
    if (inputModalHost) inputModalHost.value = inputHost?.value || 'localhost';
    if (inputModalPort) inputModalPort.value = inputPort?.value || 8877;
    if (inputModalUsername) inputModalUsername.value = inputUsername?.value || 'admin';
  }

  if (modalConfiguracoes) {
    modalConfiguracoes.style.display = 'flex';
    if (inputModalHost) inputModalHost.focus();
  }
}

export function fecharModalConfig() {
  const modalConfiguracoes = document.getElementById('modalConfiguracoes');
  if (modalConfiguracoes) {
    modalConfiguracoes.style.display = 'none';
  }
}

export function initConfigModal(onConfigSalva) {
  const btnAbrirConfigModal = document.getElementById('btnAbrirConfigModal');
  const btnFecharModalConfig = document.getElementById('btnFecharModalConfig');
  const modalConfiguracoes = document.getElementById('modalConfiguracoes');
  const btnModalRestaurar = document.getElementById('btnModalRestaurar');
  const btnModalTestar = document.getElementById('btnModalTestar');
  const formModalConfig = document.getElementById('formModalConfig');
  const btnModalSalvar = document.getElementById('btnModalSalvar');
  const inputModalHost = document.getElementById('inputModalHost');
  const inputModalPort = document.getElementById('inputModalPort');
  const inputModalUsername = document.getElementById('inputModalUsername');
  const inputModalPassword = document.getElementById('inputModalPassword');
  const inputModalRefreshInterval = document.getElementById('inputModalRefreshInterval');
  const inputModalTimeout = document.getElementById('inputModalTimeout');
  const inputModalHttps = document.getElementById('inputModalHttps');

  btnAbrirConfigModal?.addEventListener('click', abrirModalConfig);
  btnFecharModalConfig?.addEventListener('click', fecharModalConfig);

  modalConfiguracoes?.addEventListener('click', (e) => {
    if (e.target === modalConfiguracoes) {
      fecharModalConfig();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalConfiguracoes && modalConfiguracoes.style.display === 'flex') {
      fecharModalConfig();
    }
  });

  btnModalRestaurar?.addEventListener('click', () => {
    if (inputModalHost) inputModalHost.value = 'localhost';
    if (inputModalPort) inputModalPort.value = 8877;
    if (inputModalUsername) inputModalUsername.value = 'admin';
    if (inputModalPassword) {
      inputModalPassword.value = 'password';
      inputModalPassword.placeholder = 'password';
    }
    if (inputModalRefreshInterval) inputModalRefreshInterval.value = '10';
    if (inputModalTimeout) inputModalTimeout.value = 5000;
    if (inputModalHttps) inputModalHttps.checked = false;

    mostrarToast('Padrões Carregados', 'Valores padrão do qBittorrent preenchidos nos campos.', 'info');
  });

  btnModalTestar?.addEventListener('click', async () => {
    if (btnModalTestar) btnModalTestar.disabled = true;
    const textoOriginal = btnModalTestar ? btnModalTestar.innerHTML : '';
    if (btnModalTestar) btnModalTestar.innerHTML = '<span>Testando...</span>';

    const payload = {
      host: inputModalHost?.value.trim() || 'localhost',
      port: Number(inputModalPort?.value) || 8877,
      username: inputModalUsername?.value.trim(),
      password: inputModalPassword?.value || undefined,
      useHttps: Boolean(inputModalHttps?.checked),
      timeoutMs: Number(inputModalTimeout?.value) || 5000,
      refreshInterval: Number(inputModalRefreshInterval?.value) || 10,
    };

    try {
      const { ok, data } = await apiService.connectClient(payload);

      if (ok && data.sucesso) {
        mostrarToast('Teste Bem-sucedido', data.mensagem || 'Conectado com sucesso ao qBittorrent!', 'success');
      } else {
        mostrarToast('Falha no Teste', data.erro || 'Não foi possível autenticar no qBittorrent.', 'error');
      }
      atualizarStatusDiagnostico(data);
      await carregarTorrents();
    } catch (err) {
      mostrarToast('Erro de Rede', `Falha ao testar conexão: ${err.message}`, 'error');
      atualizarStatusDiagnostico({ statusConexao: { conectado: false, detalhes: `Erro de teste: ${err.message}` } });
    } finally {
      if (btnModalTestar) {
        btnModalTestar.disabled = false;
        btnModalTestar.innerHTML = textoOriginal;
      }
    }
  });

  formModalConfig?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btnModalSalvar) btnModalSalvar.disabled = true;
    const textoSalvar = btnModalSalvar ? btnModalSalvar.innerHTML : '';
    if (btnModalSalvar) btnModalSalvar.innerHTML = '<span>Salvando...</span>';

    const payload = {
      host: inputModalHost?.value.trim() || 'localhost',
      port: Number(inputModalPort?.value) || 8877,
      username: inputModalUsername?.value.trim(),
      password: inputModalPassword?.value || undefined,
      useHttps: Boolean(inputModalHttps?.checked),
      timeoutMs: Number(inputModalTimeout?.value) || 5000,
      refreshInterval: Number(inputModalRefreshInterval?.value) ?? 10,
    };

    try {
      const data = await apiService.saveConfig(payload);

      if (data.sucesso) {
        mostrarToast('Configurações Salvas', 'Configurações persistidas em data/config.json com sucesso!', 'success');
        fecharModalConfig();

        configurarAutoRefresh(payload.refreshInterval);
        if (typeof onConfigSalva === 'function') {
          await onConfigSalva();
        }
      } else {
        mostrarToast('Erro ao Salvar', data.erro || 'Falha ao salvar configurações.', 'error');
      }
    } catch (err) {
      mostrarToast('Erro de Rede', err.message, 'error');
    } finally {
      if (btnModalSalvar) {
        btnModalSalvar.disabled = false;
        btnModalSalvar.innerHTML = textoSalvar;
      }
    }
  });
}

export function initQuickConnectionForm() {
  const formConnection = document.getElementById('formConnection');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputUsername = document.getElementById('inputUsername');
  const inputPassword = document.getElementById('inputPassword');
  const inputRefreshInterval = document.getElementById('inputRefreshInterval');
  const inputSaveConfig = document.getElementById('inputSaveConfig');
  const btnConectar = document.getElementById('btnConectar');
  const btnConectarText = document.getElementById('btnConectarText');
  const btnSalvarConfig = document.getElementById('btnSalvarConfig');
  const btnTestarConexao = document.getElementById('btnTestarConexao');
  const btnDesconectar = document.getElementById('btnDesconectar');
  const infoEndpoint = document.getElementById('infoEndpoint');
  const torrentFilesSection = document.getElementById('torrentFilesSection');

  inputRefreshInterval?.addEventListener('change', () => {
    configurarAutoRefresh(inputRefreshInterval.value);
  });

  formConnection?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btnConectar) btnConectar.disabled = true;
    if (btnConectarText) btnConectarText.textContent = 'Autenticando...';

    const payload = {
      host: inputHost?.value.trim() || 'localhost',
      port: Number(inputPort?.value) || 8877,
      username: inputUsername?.value.trim(),
      password: inputPassword?.value || undefined,
      useHttps: Boolean(inputHttps?.checked),
      refreshInterval: Number(inputRefreshInterval?.value) ?? 10,
      salvarConfig: Boolean(inputSaveConfig?.checked),
    };

    const proto = payload.useHttps ? 'https' : 'http';
    if (infoEndpoint) infoEndpoint.textContent = `${proto}://${payload.host}:${payload.port}`;

    try {
      const { ok, data } = await apiService.connectClient(payload);

      if (ok && data.sucesso) {
        mostrarToast('Conexão Estabelecida', data.mensagem || 'Conectado com sucesso ao qBittorrent!', 'success');
      } else {
        const msgErro = data.erro || data.mensagem || 'Não foi possível conectar ao qBittorrent.';
        mostrarToast('Falha na Autenticação', msgErro, 'error');
      }

      atualizarStatusDiagnostico(data);
      configurarAutoRefresh(payload.refreshInterval);
      await carregarTorrents();
    } catch (err) {
      mostrarToast('Erro de Rede', `Falha ao enviar requisição: ${err.message}`, 'error');
      atualizarStatusDiagnostico({ statusConexao: { conectado: false, detalhes: `Erro de comunicação: ${err.message}` } });
    } finally {
      if (btnConectar) btnConectar.disabled = false;
      if (!state.isConectadoCliente && btnConectarText) {
        btnConectarText.textContent = 'Conectar ao qBittorrent';
      }
    }
  });

  btnSalvarConfig?.addEventListener('click', async () => {
    if (btnSalvarConfig) btnSalvarConfig.disabled = true;
    try {
      const payload = {
        host: inputHost?.value.trim() || 'localhost',
        port: Number(inputPort?.value) || 8877,
        username: inputUsername?.value.trim(),
        password: inputPassword?.value || undefined,
        useHttps: Boolean(inputHttps?.checked),
        refreshInterval: Number(inputRefreshInterval?.value) ?? 10,
      };

      const data = await apiService.saveConfig(payload);
      if (data.sucesso) {
        configurarAutoRefresh(payload.refreshInterval);
        mostrarToast('Configurações Salvas', 'As configurações foram salvas em data/config.json com sucesso!', 'success');
      } else {
        mostrarToast('Erro ao Salvar', data.erro || 'Falha ao salvar configurações', 'error');
      }
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    } finally {
      if (btnSalvarConfig) btnSalvarConfig.disabled = false;
    }
  });

  btnTestarConexao?.addEventListener('click', async () => {
    if (btnTestarConexao) btnTestarConexao.disabled = true;
    try {
      const { ok, data } = await apiService.connectClient({});
      if (ok && data.sucesso) {
        mostrarToast('Status Atualizado', 'Conexão confirmada com sucesso!', 'success');
      } else {
        mostrarToast('Aviso', data.erro || data.mensagem, 'error');
      }
      atualizarStatusDiagnostico(data);
      await carregarTorrents();
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
      atualizarStatusDiagnostico({ statusConexao: { conectado: false, detalhes: `Erro: ${err.message}` } });
    } finally {
      if (btnTestarConexao) btnTestarConexao.disabled = false;
    }
  });

  btnDesconectar?.addEventListener('click', async () => {
    try {
      const data = await apiService.disconnectClient();
      mostrarToast('Desconectado', 'Sessão encerrada com o cliente.', 'info');
      if (torrentFilesSection) torrentFilesSection.style.display = 'none';
      state.torrentSelecionadoAtual = null;
      state.todosArquivosDoTorrent = [];
      state.arquivosSelecionadosIndices.clear();
      atualizarStatusDiagnostico({
        statusConexao: { conectado: false, detalhes: 'Desconectado pelo usuário' }
      });
      await carregarTorrents();
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    }
  });
}
