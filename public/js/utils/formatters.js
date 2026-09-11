/**
 * Utilitários de formatação de dados e tradução de status para o TorrentManager
 */

import { t, formatNumber, formatTime } from './i18n.js';

export { formatNumber, formatTime };

export function formatarTamanho(bytes) {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const valor = bytes / Math.pow(1024, i);
  return `${valor.toFixed(valor >= 100 ? 0 : 2)} ${unidades[i]}`;
}

export function formatarVelocidade(bytesPorSec) {
  if (!bytesPorSec || bytesPorSec <= 0) return '0 B/s';
  return `${formatarTamanho(bytesPorSec)}/s`;
}

export function mapearStatusLegivel(status, rawState) {
  if (rawState) {
    switch (rawState) {
      case 'downloading':
        return { label: t('status_downloading'), classe: 'downloading' };
      case 'forcedDL':
        return { label: t('status_forcedDL'), classe: 'downloading' };
      case 'stalledDL':
        return { label: t('status_stalledDL'), classe: 'downloading' };
      case 'metaDL':
        return { label: t('status_metaDL'), classe: 'downloading' };
      case 'forcedMetaDL':
        return { label: t('status_forcedMetaDL'), classe: 'downloading' };
      case 'uploading':
        return { label: t('status_uploading'), classe: 'uploading' };
      case 'forcedUP':
        return { label: t('status_forcedUP'), classe: 'uploading' };
      case 'stalledUP':
        return { label: t('status_stalledUP'), classe: 'uploading' };
      case 'pausedDL':
        return { label: t('status_pausedDL'), classe: 'paused' };
      case 'stoppedDL':
        return { label: t('status_stoppedDL'), classe: 'paused' };
      case 'pausedUP':
        return { label: t('status_pausedUP'), classe: 'completed' };
      case 'stoppedUP':
        return { label: t('status_stoppedUP'), classe: 'completed' };
      case 'queuedDL':
        return { label: t('status_queuedDL'), classe: 'queued' };
      case 'queuedUP':
        return { label: t('status_queuedUP'), classe: 'queued' };
      case 'queuedForChecking':
        return { label: t('status_queuedForChecking'), classe: 'queued' };
      case 'checkingDL':
      case 'checkingUP':
      case 'checkingResumeData':
      case 'checking':
        return { label: t('status_checking'), classe: 'checking' };
      case 'allocating':
        return { label: t('status_allocating'), classe: 'checking' };
      case 'moving':
        return { label: t('status_moving'), classe: 'checking' };
      case 'error':
        return { label: t('status_error'), classe: 'error' };
      case 'missingFiles':
        return { label: t('status_missingFiles'), classe: 'error' };
      default:
        break;
    }
  }

  switch (status) {
    case 'downloading':
      return { label: t('status_downloading'), classe: 'downloading' };
    case 'uploading':
      return { label: t('status_uploading'), classe: 'uploading' };
    case 'paused':
      return { label: t('status_paused'), classe: 'paused' };
    case 'completed':
      return { label: t('status_completed'), classe: 'completed' };
    case 'queued':
      return { label: t('status_queued'), classe: 'queued' };
    case 'checking':
      return { label: t('status_checking'), classe: 'checking' };
    case 'error':
      return { label: t('status_error'), classe: 'error' };
    default:
      return { label: rawState || t('status_unknown'), classe: 'paused' };
  }
}

export function formatarPrioridade(prio) {
  switch (Number(prio)) {
    case 0:
      return { label: t('prio_skip'), classe: 'prio-skip' };
    case 1:
      return { label: t('prio_normal'), classe: 'prio-normal' };
    case 6:
      return { label: t('prio_high'), classe: 'prio-high' };
    case 7:
      return { label: t('prio_maximal'), classe: 'prio-maximal' };
    default:
      return { label: t('prio_custom', { prio }), classe: 'prio-normal' };
  }
}

export function normalizarTextoBusca(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function extrairTokensBusca(termo) {
  if (!termo) return [];
  const normalized = normalizarTextoBusca(termo).trim();
  if (!normalized) return [];

  const tokens = [];
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const token = match[1] || match[2] || match[3];
    if (token && token.trim()) {
      tokens.push(token.trim());
    }
  }
  return tokens;
}
