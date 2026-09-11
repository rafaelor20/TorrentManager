/**
 * TorrentManager — Frontend Entry Point
 * Modular web interface entry point
 */

import { apiService } from './js/services/apiService.js';
import { initToast, mostrarToast } from './js/components/toast.js';
import { setFeedback, atualizarStatusDiagnostico } from './js/components/diagnostics.js';
import { carregarTorrents, initTorrentsTable } from './js/components/torrentsTable.js';
import { initFilesManager } from './js/components/filesManager.js';
import { initConfigModal, initQuickConnectionForm, configurarAutoRefresh } from './js/components/configModal.js';
import { initI18n, getLanguage, setLanguage, t } from './js/utils/i18n.js';

export function initLanguageSelector() {
  const btnHeaderLang = document.getElementById('btnHeaderLang');
  const langDropdown = document.getElementById('langDropdown');
  const headerLangFlag = document.getElementById('headerLangFlag');
  const headerLangCode = document.getElementById('headerLangCode');
  const dropdownItems = document.querySelectorAll('.lang-dropdown-item');

  function updateDropdownUI(currentLang) {
    const isPt = currentLang === 'pt-BR';
    if (headerLangFlag) headerLangFlag.textContent = isPt ? '🇧🇷' : '🇺🇸';
    if (headerLangCode) headerLangCode.textContent = isPt ? 'PT' : 'EN';

    dropdownItems.forEach((item) => {
      const lang = item.dataset.lang;
      item.classList.toggle('active', lang === currentLang);
    });
  }

  // Initial UI state
  updateDropdownUI(getLanguage());

  // Toggle dropdown
  btnHeaderLang?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (langDropdown) {
      const isVisible = langDropdown.style.display === 'block';
      langDropdown.style.display = isVisible ? 'none' : 'block';
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (langDropdown && langDropdown.style.display === 'block') {
      if (!langDropdown.contains(e.target) && !btnHeaderLang?.contains(e.target)) {
        langDropdown.style.display = 'none';
      }
    }
  });

  // Handle item click
  dropdownItems.forEach((item) => {
    item.addEventListener('click', async () => {
      const selectedLang = item.dataset.lang;
      if (selectedLang) {
        setLanguage(selectedLang);
        updateDropdownUI(selectedLang);
        if (langDropdown) langDropdown.style.display = 'none';

        mostrarToast(
          t('toast_lang_changed_title'),
          selectedLang === 'pt-BR'
            ? 'Idioma da interface alterado para Português (Brasil).'
            : 'Interface language set to English (Default).',
          'info'
        );

        // Synchronize with backend config if available
        try {
          await apiService.saveConfig({ language: selectedLang });
        } catch {
          // Backend might be offline; localStorage persistence in i18n is already active
        }
      }
    });
  });

  // Listen to external language change events (e.g. from config modal)
  window.addEventListener('languageChanged', (e) => {
    updateDropdownUI(e.detail.language);
  });
}

// Load persisted settings and general application status
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

    if (data.config?.language) {
      const localLang = localStorage.getItem('torrentmanager_lang');
      if (!localLang) {
        setLanguage(data.config.language);
      }
    }

    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill active';
    if (systemStatusText) {
      systemStatusText.textContent = data.mensagem || t('status_started');
    }

    if (data.clienteAtivo && activeClientName) {
      activeClientName.textContent = data.clienteAtivo;
    }

    // Populate form fields with saved settings
    if (data.config) {
      if (inputHost && !inputHost.value) inputHost.value = data.config.host || 'localhost';
      if (inputPort && !inputPort.value) inputPort.value = data.config.port || 8877;
      if (inputUsername && !inputUsername.value && data.config.username) inputUsername.value = data.config.username;
      if (inputRefreshInterval) inputRefreshInterval.value = data.config.refreshInterval !== undefined ? data.config.refreshInterval : 10;
      if (inputTimeoutMs) inputTimeoutMs.value = data.config.timeoutMs || 5000;
      if (inputHttps) inputHttps.checked = Boolean(data.config.useHttps);

      if (data.config.hasPassword && inputPassword && !inputPassword.value) {
        inputPassword.placeholder = t('placeholder_password_saved');
      }

      configurarAutoRefresh(data.config.refreshInterval !== undefined ? data.config.refreshInterval : 10);
    }

    atualizarStatusDiagnostico(data);
  } catch (err) {
    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill offline';
    if (systemStatusText) systemStatusText.textContent = t('status_api_offline');
    setFeedback('error', t('server_error'), t('backend_offline_msg', { err: err.message }));
  }
}

// Application initialization after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize internationalization system
  initI18n();
  initLanguageSelector();

  // Initialize components and event listeners
  initToast();
  initTorrentsTable();
  initFilesManager();
  initConfigModal(async () => {
    await carregarDados();
    await carregarTorrents();
  });
  initQuickConnectionForm();

  // Initial data and torrent list loading
  await carregarDados();
  await carregarTorrents();
});