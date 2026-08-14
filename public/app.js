/**
 * TorrentManager — Frontend Entry Point
 * Ponto de entrada modular da interface web
 */

import { apiService } from './js/services/apiService.js';
import { initToast, mostrarToast } from './js/components/toast.js';
import { setFeedback, atualizarStatusDiagnostico } from './js/components/diagnostics.js';
import { carregarTorrents, initTorrentsTable } from './js/components/torrentsTable.js';
import { initFilesManager } from './js/components/filesManager.js';
import { initConfigModal, initQuickConnectionForm, configurarAutoRefresh } from './js/components/configModal.js';

// Carrega configurações persistidas e status geral da aplicação
export async function carregarDados() {
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');
  const activeClientName = document.getElementById('activeClientName');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputUsername = document.getElementById('inputUsername');
  const inputPassword = document.getElementById('inputPassword');
  const inputRefreshInterval = document.getElementById('inputRefreshInterval');
  const inputTimeoutMs = document.getElementById('inputTimeoutMs');
  const inputHttps = document.getElementById('inputHttps');

  try {
    const data = await apiService.getStatus();

    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill active';
    if (systemStatusText) systemStatusText.textContent = data.mensagem || 'Aplicação iniciada';

    if (data.clienteAtivo && activeClientName) {
      activeClientName.textContent = data.clienteAtivo;
    }

    // Preenche campos do formulário com as configurações salvas
    if (data.config) {
      if (inputHost && !inputHost.value) inputHost.value = data.config.host || 'localhost';
      if (inputPort && !inputPort.value) inputPort.value = data.config.port || 8877;
      if (inputUsername && !inputUsername.value && data.config.username) inputUsername.value = data.config.username;
      if (inputRefreshInterval) inputRefreshInterval.value = data.config.refreshInterval !== undefined ? data.config.refreshInterval : 10;
      if (inputTimeoutMs) inputTimeoutMs.value = data.config.timeoutMs || 5000;
      if (inputHttps) inputHttps.checked = Boolean(data.config.useHttps);

      if (data.config.hasPassword && inputPassword && !inputPassword.value) {
        inputPassword.placeholder = '•••••••• (senha salva)';
      }

      configurarAutoRefresh(data.config.refreshInterval !== undefined ? data.config.refreshInterval : 10);
    }

    atualizarStatusDiagnostico(data);
  } catch (err) {
    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill offline';
    if (systemStatusText) systemStatusText.textContent = 'API Inacessível';
    setFeedback('error', 'Erro de Servidor', `Não foi possível contatar o backend local: ${err.message}`);
  }
}

// Inicialização da aplicação após o carregamento do DOM
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa componentes e listeners
  initToast();
  initTorrentsTable();
  initFilesManager();
  initConfigModal(async () => {
    await carregarDados();
    await carregarTorrents();
  });
  initQuickConnectionForm();

  // Carregamento inicial de dados e lista de torrents
  await carregarDados();
  await carregarTorrents();
});