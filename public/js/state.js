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
};
