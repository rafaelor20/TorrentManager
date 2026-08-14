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
