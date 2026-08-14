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

  // Filtro de status dos arquivos ('all' | 'active' | 'inactive')
  filtroStatusArquivo: 'all',

  // Ordem, larguras e visibilidade das colunas da tabela de arquivos
  columnOrder: ['check', 'index', 'name', 'path', 'size', 'priority', 'progress'],
  columnWidths: {},
  hiddenColumns: new Set(), // Conjunto com os IDs das colunas ocultas
};


