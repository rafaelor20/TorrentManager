/**
 * Shared in-memory application state
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

  // File sorting
  sortColumn: 'index', // 'check' | 'index' | 'name' | 'path' | 'size' | 'priority' | 'progress'
  sortDirection: 'asc', // 'asc' | 'desc'

  // File status filter ('all' | 'active' | 'inactive')
  filtroStatusArquivo: 'all',

  // List of loaded torrents, filters, categories, and sorting
  todosTorrents: [],
  torrentsFiltrados: [],
  filtroTorrentsStatus: 'all', // 'all' | 'completed' | 'downloading' | 'paused'
  filtroTorrentsCategoria: 'all', // 'all' | '__none__' (uncategorized) | '<category_name>'
  agruparPorCategoria: false, // boolean: grouped view in blocks by category
  modoConsolidadoCategoria: false, // boolean: merges torrents of each category into a single consolidated virtual torrent
  categoriasDisponiveis: [], // list of unique categories found
  termoBuscaTorrents: '',
  torrentSortColumn: 'name', // 'name' | 'category' | 'status' | 'progress' | 'size' | 'speeds'
  torrentSortDirection: 'asc', // 'asc' | 'desc'

  // Order, widths, and visibility of files table columns
  columnOrder: ['check', 'index', 'name', 'path', 'size', 'priority', 'progress'],
  columnWidths: {},
  hiddenColumns: new Set(), // Set containing IDs of hidden columns
};


