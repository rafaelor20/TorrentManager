/**
 * Componente da Tabela de Torrents e Estatísticas Rápidas
 * Recursos:
 * - Ordenação Inteligente por Coluna (Nome, Status, Progresso, Tamanho, Velocidade)
 * - Indicadores visuais de ordenação (▲ / ▼ / ↕)
 * - Sincronização em tempo real e atualização de estatísticas
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { formatarTamanho, formatarVelocidade, mapearStatusLegivel } from '../utils/formatters.js';
import { mostrarToast } from './toast.js';
import { selecionarTorrent } from './filesManager.js';

// ==========================================
// 1. ORDENAÇÃO DE TORRENTS (SORTING)
// ==========================================

export function alterarOrdenacaoTorrents(colunaId) {
  if (state.torrentSortColumn === colunaId) {
    state.torrentSortDirection = state.torrentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.torrentSortColumn = colunaId;
    state.torrentSortDirection = (colunaId === 'size' || colunaId === 'progress' || colunaId === 'speeds') ? 'desc' : 'asc';
  }

  atualizarIndicadoresOrdenacaoTorrentsUI();
  renderizarTabelaTorrents();

  const labels = {
    name: 'Nome',
    status: 'Status',
    progress: 'Progresso',
    size: 'Tamanho',
    speeds: 'Velocidade',
  };
  const dirLabel = state.torrentSortDirection === 'asc' ? 'crescente' : 'decrescente';
  mostrarToast('Ordenação de Torrents', `Torrents ordenados por ${labels[colunaId] || colunaId} (${dirLabel}).`, 'info');
}

export function atualizarIndicadoresOrdenacaoTorrentsUI() {
  document.querySelectorAll('#torrentTableHeaderRow th.sortable-th').forEach((th) => {
    const colId = th.dataset.col;
    const arrow = th.querySelector('.sort-arrow');
    const isCurrent = state.torrentSortColumn === colId;

    th.classList.remove('sorted-asc', 'sorted-desc');
    if (arrow) {
      if (isCurrent) {
        th.classList.add(state.torrentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        arrow.textContent = state.torrentSortDirection === 'asc' ? '▲' : '▼';
      } else {
        arrow.textContent = '↕';
      }
    }
  });
}

export function ordenarTorrents(lista) {
  if (!lista || lista.length <= 1) return lista;

  const col = state.torrentSortColumn || 'name';
  const isAsc = state.torrentSortDirection === 'asc';
  const mult = isAsc ? 1 : -1;

  return [...lista].sort((a, b) => {
    switch (col) {
      case 'name': {
        const nomeA = String(a.name || '');
        const nomeB = String(b.name || '');
        return nomeA.localeCompare(nomeB, undefined, { numeric: true, sensitivity: 'base' }) * mult;
      }
      case 'status': {
        const statusA = mapearStatusLegivel(a.status, a.rawState).label || '';
        const statusB = mapearStatusLegivel(b.status, b.rawState).label || '';
        const comp = statusA.localeCompare(statusB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return comp * mult;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
      }
      case 'progress': {
        const progA = typeof a.progress === 'number' ? (a.progress > 1 ? a.progress : a.progress * 100) : 0;
        const progB = typeof b.progress === 'number' ? (b.progress > 1 ? b.progress : b.progress * 100) : 0;
        const diff = (progA - progB) * mult;
        if (diff !== 0) return diff;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
      }
      case 'size': {
        const sizeA = Number(a.size || 0);
        const sizeB = Number(b.size || 0);
        const diff = (sizeA - sizeB) * mult;
        if (diff !== 0) return diff;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
      }
      case 'speeds': {
        const speedA = Number((a.downloadSpeed || 0) + (a.uploadSpeed || 0));
        const speedB = Number((b.downloadSpeed || 0) + (b.uploadSpeed || 0));
        const diff = (speedA - speedB) * mult;
        if (diff !== 0) return diff;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
      }
      default:
        return 0;
    }
  });
}

// ==========================================
// 2. RENDERIZAÇÃO DA TABELA DE TORRENTS
// ==========================================

export function renderizarTabelaTorrents() {
  const torrentsTableBody = document.getElementById('torrentsTableBody');
  if (!torrentsTableBody) return;

  const torrents = state.todosTorrents || [];

  if (torrents.length === 0) {
    torrentsTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-icon">📂</div>
            <h4>Nenhum torrent encontrado</h4>
            <p>Não há torrents ativos no cliente ou a conexão aguarda autenticação.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const torrentsOrdenados = ordenarTorrents(torrents);

  torrentsTableBody.innerHTML = torrentsOrdenados.map((t) => {
    const statusInfo = mapearStatusLegivel(t.status, t.rawState);
    const percentualNum = typeof t.progress === 'number'
      ? (t.progress > 1 ? t.progress : t.progress * 100)
      : 0;
    const percentualStr = percentualNum.toFixed(1) + '%';
    const isComplete = percentualNum >= 100;

    const tamanhoFormatado = formatarTamanho(t.size);
    const dlSpeedStr = t.downloadSpeed > 0 ? `↓ ${formatarVelocidade(t.downloadSpeed)}` : '';
    const upSpeedStr = t.uploadSpeed > 0 ? `↑ ${formatarVelocidade(t.uploadSpeed)}` : '';
    const speedDisplay = (dlSpeedStr || upSpeedStr)
      ? `<span class="speed-down">${dlSpeedStr}</span><span class="speed-up">${upSpeedStr}</span>`
      : '<span style="color: var(--text-muted);">—</span>';

    const isSelected = state.torrentSelecionadoAtual && state.torrentSelecionadoAtual.hash === t.hash;

    return `
      <tr class="torrent-row ${isSelected ? 'selected' : ''}" data-hash="${t.hash}">
        <td class="cell-action">
          <button class="btn btn-outline btn-xs btn-select-torrent" title="Ver arquivos deste torrent">
            <span>${isSelected ? '✓ Selecionado' : 'Ver Arquivos'}</span>
          </button>
        </td>
        <td class="cell-name">
          <span class="torrent-name-text" title="${t.name}">${t.name}</span>
          <span class="torrent-hash-sub">${t.hash ? t.hash.substring(0, 10) + '...' : ''}</span>
        </td>
        <td class="cell-status">
          <span class="status-tag ${statusInfo.classe}">
            ${statusInfo.label}
          </span>
        </td>
        <td class="cell-progress">
          <div class="progress-wrapper">
            <div class="progress-label-row">
              <span>${percentualStr}</span>
              <span>${isComplete ? 'Concluído' : ''}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${Math.min(100, Math.max(0, percentualNum))}%;"></div>
            </div>
          </div>
        </td>
        <td class="cell-size">
          ${tamanhoFormatado}
        </td>
        <td class="cell-speeds">
          ${speedDisplay}
        </td>
      </tr>
    `;
  }).join('');

  // Adiciona listener de clique em cada linha / botão de seleção
  torrentsOrdenados.forEach((t) => {
    const row = torrentsTableBody.querySelector(`.torrent-row[data-hash="${t.hash}"]`);
    row?.addEventListener('click', () => selecionarTorrent(t));
  });
}

// ==========================================
// 3. CARREGAMENTO E SINCRONIZAÇÃO DA API
// ==========================================

export async function carregarTorrents(isManual = false) {
  const btnRecarregarTorrents = document.getElementById('btnRecarregarTorrents');
  const btnRecarregarText = document.getElementById('btnRecarregarText');
  const refreshIcon = document.getElementById('refreshIcon');
  const lastSyncTime = document.getElementById('lastSyncTime');
  const statTotalTorrents = document.getElementById('statTotalTorrents');
  const statCompletedTorrents = document.getElementById('statCompletedTorrents');
  const statDownloadingTorrents = document.getElementById('statDownloadingTorrents');
  const statPausedTorrents = document.getElementById('statPausedTorrents');
  const statTotalSize = document.getElementById('statTotalSize');
  const tableCountText = document.getElementById('tableCountText');
  const torrentsTableBody = document.getElementById('torrentsTableBody');
  const activeClientName = document.getElementById('activeClientName');

  if (isManual && btnRecarregarTorrents && btnRecarregarText && refreshIcon) {
    btnRecarregarTorrents.disabled = true;
    refreshIcon.classList.add('spin-animation');
    btnRecarregarText.textContent = 'Atualizando...';
  }

  try {
    const { ok, data } = await apiService.getTorrents();

    const agora = new Date();
    const horaStr = agora.toLocaleTimeString('pt-BR');
    if (lastSyncTime) lastSyncTime.textContent = `Última sincronização: ${horaStr}`;

    if (ok && data.sucesso) {
      const torrents = data.torrents || [];
      state.todosTorrents = torrents;

      // Atualiza estatísticas no topo
      if (statTotalTorrents) statTotalTorrents.textContent = torrents.length;

      let countCompleted = 0;
      let countDownloading = 0;
      let countPaused = 0;
      let bytesTotal = 0;

      torrents.forEach((t) => {
        bytesTotal += t.size || 0;
        if (t.status === 'uploading' || t.status === 'completed' || t.progress >= 1) {
          countCompleted++;
        } else if (t.status === 'downloading') {
          countDownloading++;
        } else if (t.status === 'paused') {
          countPaused++;
        }
      });

      if (statCompletedTorrents) statCompletedTorrents.textContent = countCompleted;
      if (statDownloadingTorrents) statDownloadingTorrents.textContent = countDownloading;
      if (statPausedTorrents) statPausedTorrents.textContent = countPaused;
      if (statTotalSize) statTotalSize.textContent = formatarTamanho(bytesTotal);

      const clientNome = activeClientName ? activeClientName.textContent : 'qBittorrent';
      if (tableCountText) {
        tableCountText.textContent = torrents.length === 1
          ? '1 torrent carregado'
          : `${torrents.length} torrents carregados do ${clientNome}`;
      }

      atualizarIndicadoresOrdenacaoTorrentsUI();
      renderizarTabelaTorrents();

      if (isManual) {
        mostrarToast('Torrents Atualizados', `${torrents.length} torrents sincronizados com sucesso!`, 'success');
      }
    } else {
      state.todosTorrents = [];
      if (tableCountText) tableCountText.textContent = 'Erro ao listar torrents';
      if (torrentsTableBody) {
        torrentsTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="6">
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>Falha ao carregar torrents</h4>
                <p>${data.erro || 'Verifique se o cliente BitTorrent está conectado e tente novamente.'}</p>
              </div>
            </td>
          </tr>
        `;
      }
      if (isManual) {
        mostrarToast('Erro ao Atualizar', data.erro || 'Não foi possível carregar a lista de torrents.', 'error');
      }
    }
  } catch (err) {
    state.todosTorrents = [];
    if (tableCountText) tableCountText.textContent = 'Erro de comunicação';
    if (torrentsTableBody) {
      torrentsTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">✕</div>
              <h4>Erro de rede</h4>
              <p>${err.message}</p>
            </div>
          </td>
        </tr>
      `;
    }
    if (isManual) {
      mostrarToast('Erro de Rede', err.message, 'error');
    }
  } finally {
    if (isManual && btnRecarregarTorrents && refreshIcon && btnRecarregarText) {
      setTimeout(() => {
        btnRecarregarTorrents.disabled = false;
        refreshIcon.classList.remove('spin-animation');
        btnRecarregarText.textContent = 'Atualizar Torrents';
      }, 300);
    }
  }
}

// ==========================================
// 4. INICIALIZAÇÃO DE LISTENERS
// ==========================================

export function initTorrentsTable() {
  const btnRecarregarTorrents = document.getElementById('btnRecarregarTorrents');
  const headerRow = document.getElementById('torrentTableHeaderRow');

  btnRecarregarTorrents?.addEventListener('click', () => {
    carregarTorrents(true);
  });

  // Listener de clique nos cabeçalhos para ordenação
  headerRow?.addEventListener('click', (e) => {
    const th = e.target.closest('th.sortable-th');
    if (!th) return;

    const colId = th.dataset.col;
    if (colId) {
      alterarOrdenacaoTorrents(colId);
    }
  });

  atualizarIndicadoresOrdenacaoTorrentsUI();
}
