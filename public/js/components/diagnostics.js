/**
 * Diagnostic Panel and Connection Feedback Component
 */

import { state } from '../state.js';
import { t } from '../utils/i18n.js';

let ultimoStatusData = null;

export function setFeedback(tipo, titulo, detalhe) {
  const feedbackBanner = document.getElementById('feedbackBanner');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackDetail = document.getElementById('feedbackDetail');
  const feedbackIcon = document.getElementById('feedbackIcon');

  if (!feedbackBanner || !feedbackTitle || !feedbackDetail) return;

  feedbackBanner.className = `feedback-banner ${tipo}`;
  feedbackTitle.textContent = titulo;
  feedbackDetail.textContent = detalhe;
  if (feedbackIcon) {
    feedbackIcon.textContent = tipo === 'success' ? '✓' : tipo === 'error' ? '✕' : '⚡';
  }
}

export function atualizarStatusDiagnostico(data) {
  if (data) {
    ultimoStatusData = data;
  } else if (ultimoStatusData) {
    data = ultimoStatusData;
  } else {
    return;
  }

  const isConectado = Boolean(
    data.statusConexao?.conectado ||
    data.status?.conectado ||
    (data.sucesso && data.infoCliente)
  );
  state.isConectadoCliente = isConectado;

  const info = data.infoCliente || {};
  const statusConexao = data.statusConexao || data.status || {};
  const clienteNome = data.clienteAtivo || statusConexao.cliente || 'qBittorrent';

  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');
  const activeClientName = document.getElementById('activeClientName');
  const infoEndpoint = document.getElementById('infoEndpoint');
  const infoAppVersion = document.getElementById('infoAppVersion');
  const infoWebApiVersion = document.getElementById('infoWebApiVersion');
  const infoCookieStatus = document.getElementById('infoCookieStatus');
  const btnDesconectar = document.getElementById('btnDesconectar');
  const btnConectarText = document.getElementById('btnConectarText');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputHttps = document.getElementById('inputHttps');

  if (activeClientName && data.clienteAtivo) {
    activeClientName.textContent = data.clienteAtivo;
  }

  // Update displayed Endpoint
  if (infoEndpoint) {
    if (info.urlBase) {
      infoEndpoint.textContent = info.urlBase;
    } else if (inputHost?.value && inputPort?.value) {
      const proto = inputHttps?.checked ? 'https' : 'http';
      infoEndpoint.textContent = `${proto}://${inputHost.value}:${inputPort.value}`;
    }
  }

  if (isConectado) {
    // Header Badges
    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill active';
    if (systemStatusText) {
      systemStatusText.textContent = info.appVersion 
        ? t('status_connected_ver', { version: info.appVersion })
        : t('status_connected');
    }

    // Diagnostic Panel Rows
    if (infoAppVersion) infoAppVersion.textContent = info.appVersion || 'v5.x';
    if (infoWebApiVersion) infoWebApiVersion.textContent = info.webApiVersion || 'v2.x';

    if (infoCookieStatus) {
      const latenciaStr = info.latencyMs !== undefined ? ` • ${info.latencyMs}ms` : '';
      infoCookieStatus.textContent = t('diag_cookie_active', { lat: latenciaStr });
      infoCookieStatus.style.color = '#34d399';
    }

    if (btnDesconectar) btnDesconectar.style.display = 'inline-flex';
    if (btnConectarText) btnConectarText.textContent = t('btn_quick_reconnect');

    // Featured Feedback Banner
    const detalheMsg = statusConexao.detalhes || 
      (info.appVersion 
        ? `${t('status_connected')} ${clienteNome} ${info.appVersion} (Web API v${info.webApiVersion || '2.x'}) ${info.urlBase || 'localhost'}`
        : t('diag_banner_connected_detail'));

    setFeedback('success', t('diag_banner_connected_title', { client: clienteNome }), detalheMsg);
  } else {
    // Header Badges
    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill offline';
    if (systemStatusText) systemStatusText.textContent = t('status_disconnected');

    // Diagnostic Panel Rows
    if (infoAppVersion) infoAppVersion.textContent = '—';
    if (infoWebApiVersion) infoWebApiVersion.textContent = '—';
    if (infoCookieStatus) {
      infoCookieStatus.textContent = t('diag_cookie_inactive');
      infoCookieStatus.style.color = '#94a3b8';
    }

    if (btnDesconectar) btnDesconectar.style.display = 'none';
    if (btnConectarText) btnConectarText.textContent = t('btn_quick_connect');

    const detalhesErro = statusConexao.detalhes || data.erro || data.mensagem;
    if (detalhesErro && detalhesErro !== 'Não conectado' && detalhesErro !== 'Desconectado' && detalhesErro !== 'Disconnected') {
      setFeedback('error', t('diag_banner_error_title'), detalhesErro);
    } else {
      setFeedback(
        'idle',
        t('diag_banner_ready_title'),
        t('diag_banner_ready_detail')
      );
    }
  }
}

window.addEventListener('languageChanged', () => {
  if (ultimoStatusData) {
    atualizarStatusDiagnostico(ultimoStatusData);
  }
});
