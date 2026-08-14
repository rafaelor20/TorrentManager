/**
 * Estado compartilhado da aplicação em memória
 */

export const state = {
  torrentSelecionadoAtual: null,
  todosArquivosDoTorrent: [],
  arquivosFiltradosAtuais: [],
  arquivosSelecionadosIndices: new Set(),
  isConectadoCliente: false,
  autoRefreshSegundos: 10,
  timerAutoRefresh: null,
  termoBuscaAtual: '',

  // Ordenação de arquivos
  sortColumn: 'index', // 'check' | 'index' | 'name' | 'path' | 'size' | 'priority' | 'progress'
  sortDirection: 'asc', // 'asc' | 'desc'

  // Ordem e larguras das colunas da tabela de arquivos
  columnOrder: ['check', 'index', 'name', 'path', 'size', 'priority', 'progress'],
  columnWidths: {},
};
