/**
 * Componente da Tabela de Torrents e Estatísticas Rápidas
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { formatarTamanho, formatarVelocidade, mapearStatusLegivel } from '../utils/formatters.js';
import { mostrarToast } from './toast.js';
import { selecionarTorrent } from './filesManager.js';

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

      // Renderiza linhas da tabela
      if (!torrentsTableBody) return;

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
      } else {
        torrentsTableBody.innerHTML = torrents.map((t) => {
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
        torrents.forEach((t) => {
          const row = document.querySelector(`.torrent-row[data-hash="${t.hash}"]`);
          row?.addEventListener('click', () => selecionarTorrent(t));
        });
      }

      if (isManual) {
        mostrarToast('Torrents Atualizados', `${torrents.length} torrents sincronizados com sucesso!`, 'success');
      }
    } else {
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

export function initTorrentsTable() {
  const btnRecarregarTorrents = document.getElementById('btnRecarregarTorrents');
  btnRecarregarTorrents?.addEventListener('click', () => {
    carregarTorrents(true);
  });
}
