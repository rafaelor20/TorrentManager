import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { mostrarToast } from './toast.js';
import { atualizarStatusDiagnostico } from './diagnostics.js';
import { carregarTorrents } from './torrentsTable.js';
import { t, getLanguage, setLanguage } from '../utils/i18n.js';

export function configurarAutoRefresh(segundos) {
  const infoAutoRefreshStatus = document.getElementById('infoAutoRefreshStatus');

  if (state.timerAutoRefresh) {
    clearInterval(state.timerAutoRefresh);
    state.timerAutoRefresh = null;
  }

  state.autoRefreshSegundos = Number(segundos) || 0;

  if (infoAutoRefreshStatus) {
    infoAutoRefreshStatus.textContent = state.autoRefreshSegundos > 0
      ? t('diag_refresh_every', { s: state.autoRefreshSegundos })
      : t('diag_refresh_off');
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
  const inputModalLanguage = document.getElementById('inputModalLanguage');
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
        inputModalPassword.placeholder = qb.hasPassword ? t('placeholder_password_saved') : t('placeholder_password_empty');
      }
    }

    if (inputModalLanguage) {
      inputModalLanguage.value = data.config?.language || getLanguage();
    }
  } catch {
    if (inputModalHost) inputModalHost.value = inputHost?.value || 'localhost';
    if (inputModalPort) inputModalPort.value = inputPort?.value || 8877;
    if (inputModalUsername) inputModalUsername.value = inputUsername?.value || 'admin';
    if (inputModalLanguage) inputModalLanguage.value = getLanguage();
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
  const inputModalLanguage = document.getElementById('inputModalLanguage');

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
    if (inputModalLanguage) inputModalLanguage.value = 'en';

    mostrarToast(t('toast_defaults_loaded_title'), t('toast_defaults_loaded_msg'), 'info');
  });

  btnModalTestar?.addEventListener('click', async () => {
    if (btnModalTestar) btnModalTestar.disabled = true;
    const textoOriginal = btnModalTestar ? btnModalTestar.innerHTML : '';
    if (btnModalTestar) btnModalTestar.innerHTML = `<span>${t('btn_testing')}</span>`;

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
        mostrarToast(t('toast_test_success_title'), data.mensagem || t('toast_test_success_msg'), 'success');
      } else {
        mostrarToast(t('toast_test_failed_title'), data.erro || t('toast_test_failed_msg'), 'error');
      }
      atualizarStatusDiagnostico(data);
      await carregarTorrents();
    } catch (err) {
      mostrarToast(t('toast_network_error_title'), `Falha ao testar conexão: ${err.message}`, 'error');
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
    if (btnModalSalvar) btnModalSalvar.innerHTML = `<span>${t('btn_saving')}</span>`;

    const novoIdioma = inputModalLanguage?.value || getLanguage();
    const payload = {
      host: inputModalHost?.value.trim() || 'localhost',
      port: Number(inputModalPort?.value) || 8877,
      username: inputModalUsername?.value.trim(),
      password: inputModalPassword?.value || undefined,
      useHttps: Boolean(inputModalHttps?.checked),
      timeoutMs: Number(inputModalTimeout?.value) || 5000,
      refreshInterval: Number(inputModalRefreshInterval?.value) ?? 10,
      language: novoIdioma,
    };

    try {
      const data = await apiService.saveConfig(payload);

      if (data.sucesso) {
        setLanguage(novoIdioma);
        mostrarToast(t('toast_config_saved_title'), t('toast_config_saved_msg'), 'success');
        fecharModalConfig();

        configurarAutoRefresh(payload.refreshInterval);
        if (typeof onConfigSalva === 'function') {
          await onConfigSalva();
        }
      } else {
        mostrarToast(t('toast_save_error_title'), data.erro || t('toast_save_error_msg'), 'error');
      }
    } catch (err) {
      mostrarToast(t('toast_network_error_title'), err.message, 'error');
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
    if (btnConectarText) btnConectarText.textContent = t('btn_quick_authenticating');

    const payload = {
      host: inputHost?.value.trim() || 'localhost',
      port: Number(inputPort?.value) || 8877,
      username: inputUsername?.value.trim(),
      password: inputPassword?.value || undefined,
      useHttps: Boolean(inputHttps?.checked),
      refreshInterval: Number(inputRefreshInterval?.value) ?? 10,
      salvarConfig: Boolean(inputSaveConfig?.checked),
      language: getLanguage(),
    };

    const proto = payload.useHttps ? 'https' : 'http';
    if (infoEndpoint) infoEndpoint.textContent = `${proto}://${payload.host}:${payload.port}`;

    try {
      const { ok, data } = await apiService.connectClient(payload);

      if (ok && data.sucesso) {
        mostrarToast(t('toast_connected_title'), data.mensagem || t('toast_test_success_msg'), 'success');
      } else {
        const msgErro = data.erro || data.mensagem || t('toast_test_failed_msg');
        mostrarToast(t('toast_test_failed_title'), msgErro, 'error');
      }

      atualizarStatusDiagnostico(data);
      configurarAutoRefresh(payload.refreshInterval);
      await carregarTorrents();
    } catch (err) {
      mostrarToast(t('toast_network_error_title'), `Falha ao enviar requisição: ${err.message}`, 'error');
      atualizarStatusDiagnostico({ statusConexao: { conectado: false, detalhes: `Erro de comunicação: ${err.message}` } });
    } finally {
      if (btnConectar) btnConectar.disabled = false;
      if (!state.isConectadoCliente && btnConectarText) {
        btnConectarText.textContent = t('btn_quick_connect');
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
        language: getLanguage(),
      };

      const data = await apiService.saveConfig(payload);
      if (data.sucesso) {
        configurarAutoRefresh(payload.refreshInterval);
        mostrarToast(t('toast_config_saved_title'), t('toast_config_saved_msg'), 'success');
      } else {
        mostrarToast(t('toast_save_error_title'), data.erro || t('toast_save_error_msg'), 'error');
      }
    } catch (err) {
      mostrarToast(t('toast_save_error_title'), err.message, 'error');
    } finally {
      if (btnSalvarConfig) btnSalvarConfig.disabled = false;
    }
  });

  btnTestarConexao?.addEventListener('click', async () => {
    if (btnTestarConexao) btnTestarConexao.disabled = true;
    try {
      const { ok, data } = await apiService.connectClient({});
      if (ok && data.sucesso) {
        mostrarToast(t('toast_test_success_title'), t('toast_test_success_msg'), 'success');
      } else {
        mostrarToast(t('toast_test_failed_title'), data.erro || data.mensagem, 'error');
      }
      atualizarStatusDiagnostico(data);
      await carregarTorrents();
    } catch (err) {
      mostrarToast(t('toast_network_error_title'), err.message, 'error');
      atualizarStatusDiagnostico({ statusConexao: { conectado: false, detalhes: `Erro: ${err.message}` } });
    } finally {
      if (btnTestarConexao) btnTestarConexao.disabled = false;
    }
  });

  btnDesconectar?.addEventListener('click', async () => {
    try {
      const data = await apiService.disconnectClient();
      mostrarToast(t('toast_disconnected_title'), t('toast_disconnected_msg'), 'info');
      if (torrentFilesSection) torrentFilesSection.style.display = 'none';
      state.torrentSelecionadoAtual = null;
      state.todosArquivosDoTorrent = [];
      state.arquivosSelecionadosIndices.clear();
      atualizarStatusDiagnostico({
        statusConexao: { conectado: false, detalhes: t('diag_disconnected_user') }
      });
      await carregarTorrents();
    } catch (err) {
      mostrarToast(t('toast_save_error_title'), err.message, 'error');
    }
  });
}

window.addEventListener('languageChanged', () => {
  configurarAutoRefresh(state.autoRefreshSegundos);
});
