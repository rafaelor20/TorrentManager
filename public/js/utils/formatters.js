/**
 * Utilitários de formatação de dados e tradução de status para o TorrentManager
 */

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
        return { label: 'Baixando', classe: 'downloading' };
      case 'forcedDL':
        return { label: 'Baixando (Forçado)', classe: 'downloading' };
      case 'stalledDL':
        return { label: 'Baixando (Pendente)', classe: 'downloading' };
      case 'metaDL':
      case 'forcedMetaDL':
        return { label: 'Baixando Metadados', classe: 'downloading' };
      case 'uploading':
        return { label: 'Enviando (Seed)', classe: 'uploading' };
      case 'forcedUP':
        return { label: 'Enviando (Forçado)', classe: 'uploading' };
      case 'stalledUP':
        return { label: 'Enviando (Sem Conexão)', classe: 'uploading' };
      case 'pausedDL':
        return { label: 'Pausado', classe: 'paused' };
      case 'stoppedDL':
        return { label: 'Parado', classe: 'paused' };
      case 'pausedUP':
      case 'stoppedUP':
        return { label: 'Concluído (Pausado)', classe: 'completed' };
      case 'queuedDL':
        return { label: 'Em Fila (Download)', classe: 'queued' };
      case 'queuedUP':
        return { label: 'Em Fila (Envio)', classe: 'queued' };
      case 'queuedForChecking':
        return { label: 'Em Fila (Verificação)', classe: 'queued' };
      case 'checkingDL':
      case 'checkingUP':
      case 'checkingResumeData':
        return { label: 'Verificando', classe: 'checking' };
      case 'allocating':
        return { label: 'Alocando Espaço', classe: 'checking' };
      case 'moving':
        return { label: 'Movendo Arquivos', classe: 'checking' };
      case 'error':
        return { label: 'Erro', classe: 'error' };
      case 'missingFiles':
        return { label: 'Arquivos Ausentes', classe: 'error' };
      default:
        break;
    }
  }

  switch (status) {
    case 'downloading':
      return { label: 'Baixando', classe: 'downloading' };
    case 'uploading':
      return { label: 'Enviando (Seed)', classe: 'uploading' };
    case 'paused':
      return { label: 'Pausado', classe: 'paused' };
    case 'completed':
      return { label: 'Concluído', classe: 'completed' };
    case 'queued':
      return { label: 'Em Fila', classe: 'queued' };
    case 'checking':
      return { label: 'Verificando', classe: 'checking' };
    case 'error':
      return { label: 'Erro', classe: 'error' };
    default:
      return { label: rawState || 'Desconhecido', classe: 'paused' };
  }
}

export function formatarPrioridade(prio) {
  switch (Number(prio)) {
    case 0:
      return { label: 'Não baixar / Ignorado', classe: 'prio-skip' };
    case 1:
      return { label: 'Normal', classe: 'prio-normal' };
    case 6:
      return { label: 'Alta', classe: 'prio-high' };
    case 7:
      return { label: 'Máxima', classe: 'prio-maximal' };
    default:
      return { label: `Prioridade ${prio}`, classe: 'prio-normal' };
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
