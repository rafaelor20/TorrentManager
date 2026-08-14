/**
 * Componente de Painel de Diagnóstico e Feedback de Conexão
 */

import { state } from '../state.js';

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
  if (!data) return;

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

  // Atualiza Endpoint exibido
  if (infoEndpoint) {
    if (info.urlBase) {
      infoEndpoint.textContent = info.urlBase;
    } else if (inputHost?.value && inputPort?.value) {
      const proto = inputHttps?.checked ? 'https' : 'http';
      infoEndpoint.textContent = `${proto}://${inputHost.value}:${inputPort.value}`;
    }
  }

  if (isConectado) {
    // Badges do Topo
    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill active';
    if (systemStatusText) systemStatusText.textContent = info.appVersion ? `Conectado (${info.appVersion})` : 'Conectado';

    // Linhas do Painel de Diagnóstico
    if (infoAppVersion) infoAppVersion.textContent = info.appVersion || 'v5.x';
    if (infoWebApiVersion) infoWebApiVersion.textContent = info.webApiVersion || 'v2.x';

    if (infoCookieStatus) {
      const latenciaStr = info.latencyMs !== undefined ? ` • ${info.latencyMs}ms` : '';
      infoCookieStatus.textContent = `Ativo (SID Validado${latenciaStr})`;
      infoCookieStatus.style.color = '#34d399';
    }

    if (btnDesconectar) btnDesconectar.style.display = 'inline-flex';
    if (btnConectarText) btnConectarText.textContent = 'Reconectar';

    // Banner de Feedback em destaque
    const detalheMsg = statusConexao.detalhes || 
      (info.appVersion ? `Conectado ao ${clienteNome} ${info.appVersion} (Web API v${info.webApiVersion || '2.x'}) em ${info.urlBase || 'localhost'}` : 'Autenticação e sessão SID validadas com sucesso.');

    setFeedback('success', `Conectado ao ${clienteNome}`, detalheMsg);
  } else {
    // Badges do Topo
    if (systemStatusBadge) systemStatusBadge.className = 'badge status-pill offline';
    if (systemStatusText) systemStatusText.textContent = 'Desconectado';

    // Linhas do Painel de Diagnóstico
    if (infoAppVersion) infoAppVersion.textContent = '—';
    if (infoWebApiVersion) infoWebApiVersion.textContent = '—';
    if (infoCookieStatus) {
      infoCookieStatus.textContent = 'Inativo';
      infoCookieStatus.style.color = '#94a3b8';
    }

    if (btnDesconectar) btnDesconectar.style.display = 'none';
    if (btnConectarText) btnConectarText.textContent = `Conectar ao ${clienteNome}`;

    const detalhesErro = statusConexao.detalhes || data.erro || data.mensagem;
    if (detalhesErro && detalhesErro !== 'Não conectado' && detalhesErro !== 'Desconectado') {
      setFeedback('error', 'Falha na Conexão', detalhesErro);
    } else {
      setFeedback(
        'idle',
        'Pronto para conexão',
        'Credenciais prontas. Clique em "Conectar ao qBittorrent" para iniciar a sessão.'
      );
    }
  }
}
