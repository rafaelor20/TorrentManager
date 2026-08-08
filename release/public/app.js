// Frontend do TorrentManager — Etapas 1 a 8 (Seleção em Massa)
document.addEventListener('DOMContentLoaded', async () => {
  // Elementos da interface
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');
  const activeClientName = document.getElementById('activeClientName');
  const statClientName = document.getElementById('statClientName');
  const statConnectionStatus = document.getElementById('statConnectionStatus');
  const statAppVersion = document.getElementById('statAppVersion');
  const statWebApiVersion = document.getElementById('statWebApiVersion');
  
  // Elementos da seção de torrents (Etapa 4)
  const torrentsTableBody = document.getElementById('torrentsTableBody');
  const btnRecarregarTorrents = document.getElementById('btnRecarregarTorrents');
  const btnRecarregarText = document.getElementById('btnRecarregarText');
  const refreshIcon = document.getElementById('refreshIcon');
  const tableCountText = document.getElementById('tableCountText');
  const lastSyncTime = document.getElementById('lastSyncTime');
  
  // Estatísticas de torrents
  const statTotalTorrents = document.getElementById('statTotalTorrents');
  const statCompletedTorrents = document.getElementById('statCompletedTorrents');
  const statDownloadingTorrents = document.getElementById('statDownloadingTorrents');
  const statPausedTorrents = document.getElementById('statPausedTorrents');
  const statTotalSize = document.getElementById('statTotalSize');

  // Elementos da seção de arquivos (Etapas 5, 6, 7, 8 e 9)
  const torrentFilesSection = document.getElementById('torrentFilesSection');
  const selectedTorrentName = document.getElementById('selectedTorrentName');
  const selectedTorrentMeta = document.getElementById('selectedTorrentMeta');
  const selectedTorrentStatus = document.getElementById('selectedTorrentStatus');
  const filesSelectionBadge = document.getElementById('filesSelectionBadge');
  const filesCountText = document.getElementById('filesCountText');
  const selectionSummaryCount = document.getElementById('selectionSummaryCount');
  const selectionSummarySize = document.getElementById('selectionSummarySize');
  const filesHashTag = document.getElementById('filesHashTag');
  const filesTableBody = document.getElementById('filesTableBody');
  const btnFecharArquivos = document.getElementById('btnFecharArquivos');
  const btnSalvarPrioridades = document.getElementById('btnSalvarPrioridades');
  const btnSalvarPrioridadesText = document.getElementById('btnSalvarPrioridadesText');
  const savePrioIcon = document.getElementById('savePrioIcon');
  
  // Pesquisa instantânea (Etapa 6)
  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const searchResultCount = document.getElementById('searchResultCount');

  // Ações em massa (Etapa 8)
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnDeselectAll = document.getElementById('btnDeselectAll');
  const btnInvertSelection = document.getElementById('btnInvertSelection');

  // Filtros por Prioridade (Etapa 10)
  const filterHideIgnored = document.getElementById('filterHideIgnored');
  const filterOnlySelected = document.getElementById('filterOnlySelected');

  // Elementos do Modal de Configurações (Etapa 11)
  const btnAbrirConfigModal = document.getElementById('btnAbrirConfigModal');
  const modalConfiguracoes = document.getElementById('modalConfiguracoes');
  const btnFecharModalConfig = document.getElementById('btnFecharModalConfig');
  const formModalConfig = document.getElementById('formModalConfig');
  const inputModalHost = document.getElementById('inputModalHost');
  const inputModalPort = document.getElementById('inputModalPort');
  const inputModalUsername = document.getElementById('inputModalUsername');
  const inputModalPassword = document.getElementById('inputModalPassword');
  const inputModalRefreshInterval = document.getElementById('inputModalRefreshInterval');
  const inputModalTimeout = document.getElementById('inputModalTimeout');
  const inputModalHttps = document.getElementById('inputModalHttps');
  const btnModalRestaurar = document.getElementById('btnModalRestaurar');
  const btnModalTestar = document.getElementById('btnModalTestar');
  const btnModalSalvar = document.getElementById('btnModalSalvar');

  // Formulário de conexão rápido
  const formConnection = document.getElementById('formConnection');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputUsername = document.getElementById('inputUsername');
  const inputPassword = document.getElementById('inputPassword');
  const inputRefreshInterval = document.getElementById('inputRefreshInterval');
  const inputTimeoutMs = document.getElementById('inputTimeoutMs');
  const inputHttps = document.getElementById('inputHttps');
  const inputSaveConfig = document.getElementById('inputSaveConfig');
  const btnConectar = document.getElementById('btnConectar');
  const btnConectarText = document.getElementById('btnConectarText');
  const btnSalvarConfig = document.getElementById('btnSalvarConfig');

  // Painel de diagnóstico
  const feedbackBanner = document.getElementById('feedbackBanner');
  const feedbackIcon = document.getElementById('feedbackIcon');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackDetail = document.getElementById('feedbackDetail');
  const infoEndpoint = document.getElementById('infoEndpoint');
  const infoAppVersion = document.getElementById('infoAppVersion');
  const infoWebApiVersion = document.getElementById('infoWebApiVersion');
  const infoAutoRefreshStatus = document.getElementById('infoAutoRefreshStatus');
  const infoCookieStatus = document.getElementById('infoCookieStatus');
  const btnTestarConexao = document.getElementById('btnTestarConexao');
  const btnDesconectar = document.getElementById('btnDesconectar');

  // Toasts
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastCloseBtn = document.getElementById('toastCloseBtn');

  // Estado da aplicação em memória
  let torrentSelecionadoAtual = null;
  let todosArquivosDoTorrent = []; // Lista completa de arquivos do torrent ativo
  let arquivosSelecionadosIndices = new Set(); // Conjunto dos índices (index) dos arquivos marcados

  // Formata bytes para exibição legível
  function formatarTamanho(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const unidades = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const valor = bytes / Math.pow(1024, i);
    return `${valor.toFixed(valor >= 100 ? 0 : 2)} ${unidades[i]}`;
  }

  // Formata velocidade em B/s
  function formatarVelocidade(bytesPorSec) {
    if (!bytesPorSec || bytesPorSec <= 0) return '0 B/s';
    return `${formatarTamanho(bytesPorSec)}/s`;
  }

  // Traduz o status do torrent
  function mapearStatusLegivel(status, rawState) {
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

  // Traduz a prioridade do arquivo
  function formatarPrioridade(prio) {
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

  function mostrarToast(titulo, mensagem, tipo = 'info') {
    toastTitle.textContent = titulo;
    toastMessage.textContent = mensagem;
    toastIcon.textContent = tipo === 'success' ? '✓' : tipo === 'error' ? '⚠️' : 'ℹ';
    
    toastNotification.className = `toast-alert ${tipo}`;
    toastNotification.style.display = 'flex';

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toastNotification.style.display = 'none';
    }, 6000);
  }

  toastCloseBtn?.addEventListener('click', () => {
    toastNotification.style.display = 'none';
  });

  function setFeedback(tipo, titulo, detalhe) {
    feedbackBanner.className = `feedback-banner ${tipo}`;
    feedbackTitle.textContent = titulo;
    feedbackDetail.textContent = detalhe;
    feedbackIcon.textContent = tipo === 'success' ? '✓' : tipo === 'error' ? '✕' : '⚡';
  }

  // ==========================================
  // ETAPA 12: VIRTUALIZAÇÃO DE LISTA & OTIMIZAÇÃO (50.000+ ARQUIVOS)
  // ==========================================
  const ROW_HEIGHT = 44; // Altura fixa de cada linha em pixels
  const BUFFER_COUNT = 15; // Buffer de linhas renderizadas no viewport para 60 FPS
  const filesScrollArea = document.getElementById('filesScrollArea');
  let arquivosFiltradosAtuais = []; // Cache dos arquivos visíveis para o Virtual Scroll
  let scrollRafId = null;
  let termoBuscaAtual = '';

  // ==========================================
  // ETAPA 7: SELEÇÃO INDIVIDUAL DE ARQUIVOS
  // ==========================================
  function atualizarResumoSelecao() {
    const totalArquivos = todosArquivosDoTorrent.length;
    const totalSelecionados = arquivosSelecionadosIndices.size;

    // Calcula a soma do tamanho dos arquivos selecionados
    let bytesSelecionados = 0;
    todosArquivosDoTorrent.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      if (arquivosSelecionadosIndices.has(fileIndex)) {
        bytesSelecionados += f.size || 0;
      }
    });

    if (filesSelectionBadge) {
      filesSelectionBadge.textContent = `${totalSelecionados.toLocaleString('pt-BR')} marcados`;
    }
    if (selectionSummaryCount) {
      selectionSummaryCount.textContent = `${totalSelecionados.toLocaleString('pt-BR')} de ${totalArquivos.toLocaleString('pt-BR')} selecionados`;
    }
    if (selectionSummarySize) {
      selectionSummarySize.textContent = `(${formatarTamanho(bytesSelecionados)})`;
    }
  }

  function alternarSelecaoArquivo(index, forcarEstado = null) {
    const isMarcado = forcarEstado !== null
      ? forcarEstado
      : !arquivosSelecionadosIndices.has(index);

    if (isMarcado) {
      arquivosSelecionadosIndices.add(index);
    } else {
      arquivosSelecionadosIndices.delete(index);
    }

    // Atualiza a linha no DOM se estiver atualmente dentro do viewport visível
    const tr = document.querySelector(`.torrent-file-row[data-index="${index}"]`);
    if (tr) {
      tr.classList.toggle('checked', isMarcado);
      const checkbox = tr.querySelector('.file-check-input');
      if (checkbox) checkbox.checked = isMarcado;
    }

    atualizarResumoSelecao();
  }

  // Event Delegation no container de arquivos: zero alocações extras no Garbage Collector
  filesTableBody?.addEventListener('click', (e) => {
    const tr = e.target.closest('.torrent-file-row');
    if (!tr) return;
    const index = Number(tr.dataset.index);
    if (isNaN(index)) return;

    if (e.target.classList.contains('file-check-input') || e.target.closest('label.file-check-label')) {
      // Deixa o evento nativo do checkbox disparar a mudança
      return;
    }

    alternarSelecaoArquivo(index);
  });

  filesTableBody?.addEventListener('change', (e) => {
    if (e.target.classList.contains('file-check-input')) {
      const index = Number(e.target.dataset.index);
      if (!isNaN(index)) {
        alternarSelecaoArquivo(index, e.target.checked);
      }
    }
  });

  // ==========================================
  // ETAPA 8: AÇÕES DE SELEÇÃO EM MASSA
  // ==========================================
  btnSelectAll?.addEventListener('click', () => {
    const visiveis = obterArquivosVisiveis();
    if (visiveis.length === 0) return;

    visiveis.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      arquivosSelecionadosIndices.add(fileIndex);
    });

    renderizarTabelaArquivosVirtualizada();
    const termo = (inputSearchFiles?.value || '').trim();
    mostrarToast(
      'Seleção em Massa',
      termo
        ? `${visiveis.length.toLocaleString('pt-BR')} arquivos visíveis foram marcados.`
        : `Todos os ${visiveis.length.toLocaleString('pt-BR')} arquivos foram marcados.`,
      'success'
    );
  });

  btnDeselectAll?.addEventListener('click', () => {
    const visiveis = obterArquivosVisiveis();
    if (visiveis.length === 0) return;

    visiveis.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      arquivosSelecionadosIndices.delete(fileIndex);
    });

    renderizarTabelaArquivosVirtualizada();
    const termo = (inputSearchFiles?.value || '').trim();
    mostrarToast(
      'Seleção em Massa',
      termo
        ? `${visiveis.length.toLocaleString('pt-BR')} arquivos visíveis foram desmarcados.`
        : `Todos os ${visiveis.length.toLocaleString('pt-BR')} arquivos foram desmarcados.`,
      'info'
    );
  });

  btnInvertSelection?.addEventListener('click', () => {
    const visiveis = obterArquivosVisiveis();
    if (visiveis.length === 0) return;

    let totalInvertidos = 0;
    visiveis.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      const novoEstado = !arquivosSelecionadosIndices.has(fileIndex);

      if (novoEstado) {
        arquivosSelecionadosIndices.add(fileIndex);
      } else {
        arquivosSelecionadosIndices.delete(fileIndex);
      }
      totalInvertidos++;
    });

    renderizarTabelaArquivosVirtualizada();
    const termo = (inputSearchFiles?.value || '').trim();
    mostrarToast(
      'Seleção Invertida',
      termo
        ? `Seleção invertida para ${totalInvertidos.toLocaleString('pt-BR')} arquivos visíveis.`
        : `Seleção invertida para todos os ${totalInvertidos.toLocaleString('pt-BR')} arquivos.`,
      'info'
    );
  });

  // ==========================================
  // ETAPA 10 & 12: FILTROS & PESQUISA INSTANTÂNEA PRÉ-INDEXADA
  // ==========================================
  function obterArquivosVisiveis() {
    if (!todosArquivosDoTorrent || todosArquivosDoTorrent.length === 0) {
      return [];
    }

    const termo = (inputSearchFiles?.value || '').trim().toLowerCase();
    const ocultarIgnorados = Boolean(filterHideIgnored?.checked);
    const apenasSelecionados = Boolean(filterOnlySelected?.checked);

    return todosArquivosDoTorrent.filter((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;

      // 1. Filtro: Ocultar ignorados (priority === 0 / Não baixar)
      if (ocultarIgnorados && f.priority === 0) {
        return false;
      }

      // 2. Filtro: Apenas selecionados (marcados no Set)
      if (apenasSelecionados && !arquivosSelecionadosIndices.has(fileIndex)) {
        return false;
      }

      // 3. Filtro: Pesquisa instantânea por substring pré-indexada
      if (termo) {
        const searchStr = f._searchLower || ((f.name || '') + ' ' + (f.path || '')).toLowerCase();
        if (!searchStr.includes(termo)) {
          return false;
        }
      }

      return true;
    });
  }

  function filtrarArquivosInstantaneamente() {
    const termo = (inputSearchFiles?.value || '').trim();
    termoBuscaAtual = termo;

    if (btnClearSearch) {
      btnClearSearch.style.display = termo.length > 0 ? 'flex' : 'none';
    }

    if (!todosArquivosDoTorrent || todosArquivosDoTorrent.length === 0) {
      return;
    }

    arquivosFiltradosAtuais = obterArquivosVisiveis();

    // Rola de volta para o topo ao alterar a busca/filtro
    if (filesScrollArea) {
      filesScrollArea.scrollTop = 0;
    }

    renderizarTabelaArquivosVirtualizada();
  }

  // Eventos reativos para busca e filtros de prioridade
  inputSearchFiles?.addEventListener('input', filtrarArquivosInstantaneamente);
  filterHideIgnored?.addEventListener('change', filtrarArquivosInstantaneamente);
  filterOnlySelected?.addEventListener('change', filtrarArquivosInstantaneamente);

  btnClearSearch?.addEventListener('click', () => {
    inputSearchFiles.value = '';
    filtrarArquivosInstantaneamente();
    inputSearchFiles.focus();
  });

  inputSearchFiles?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inputSearchFiles.value = '';
      filtrarArquivosInstantaneamente();
    }
  });

  // ==========================================
  // RENDERIZAÇÃO VIRTUALIZADA (WINDOWING DOM)
  // ==========================================
  function renderizarTabelaArquivosVirtualizada() {
    const totalOriginal = todosArquivosDoTorrent.length;
    const totalFiltrado = arquivosFiltradosAtuais.length;

    if (termoBuscaAtual !== '') {
      searchResultCount.textContent = `${totalFiltrado.toLocaleString('pt-BR')} de ${totalOriginal.toLocaleString('pt-BR')} arquivos`;
      filesCountText.textContent = `Exibindo ${totalFiltrado.toLocaleString('pt-BR')} arquivos para "${termoBuscaAtual}"`;
    } else {
      searchResultCount.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos disponíveis`;
      filesCountText.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos carregados`;
    }

    if (totalFiltrado === 0) {
      filesTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">🔍</div>
              <h4>Nenhum arquivo encontrado</h4>
              <p>Nenhum arquivo corresponde aos filtros ativos.</p>
            </div>
          </td>
        </tr>
      `;
      atualizarResumoSelecao();
      return;
    }

    const scrollTop = filesScrollArea ? filesScrollArea.scrollTop : 0;
    const viewportHeight = filesScrollArea ? (filesScrollArea.clientHeight || 520) : 520;

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_COUNT);
    const endIndex = Math.min(totalFiltrado, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_COUNT);

    const topPadding = startIndex * ROW_HEIGHT;
    const bottomPadding = Math.max(0, (totalFiltrado - endIndex) * ROW_HEIGHT);

    const fragment = document.createDocumentFragment();

    // Espaçador virtual superior
    if (topPadding > 0) {
      const spacerTop = document.createElement('tr');
      spacerTop.className = 'virtual-spacer-row';
      spacerTop.style.height = `${topPadding}px`;
      spacerTop.innerHTML = `<td colspan="7" style="height: ${topPadding}px; padding: 0; margin: 0; border: none;"></td>`;
      fragment.appendChild(spacerTop);
    }

    // Renderiza apenas os itens visíveis no viewport (~30 a 50 linhas)
    for (let i = startIndex; i < endIndex; i++) {
      const f = arquivosFiltradosAtuais[i];
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : (f.index !== undefined ? f.index : i);
      const isSelected = arquivosSelecionadosIndices.has(fileIndex);

      const prioInfo = formatarPrioridade(f.priority);
      const percentualNum = typeof f.progress === 'number'
        ? (f.progress > 1 ? f.progress : f.progress * 100)
        : 0;
      const percentualStr = percentualNum.toFixed(1) + '%';
      const isComplete = percentualNum >= 100;

      const nomeArquivo = f.name || f.path.split('/').pop() || f.path;
      const caminhoArquivo = f.path || f.name;

      const tr = document.createElement('tr');
      tr.className = `torrent-file-row ${isSelected ? 'checked' : ''}`;
      tr.dataset.index = fileIndex;

      tr.innerHTML = `
        <td class="cell-file-check">
          <label class="file-check-label" title="Marcar ou desmarcar arquivo">
            <input type="checkbox" class="file-check-input" data-index="${fileIndex}" ${isSelected ? 'checked' : ''}>
            <span class="file-custom-check"></span>
          </label>
        </td>
        <td class="cell-file-index">${fileIndex}</td>
        <td class="cell-file-name">
          <span class="file-name-text" title="${nomeArquivo}">${nomeArquivo}</span>
        </td>
        <td class="cell-file-path">
          <span class="file-path-text" title="${caminhoArquivo}">${caminhoArquivo}</span>
        </td>
        <td class="cell-file-size">
          ${formatarTamanho(f.size)}
        </td>
        <td class="cell-file-prio">
          <span class="prio-tag ${prioInfo.classe}">
            ${prioInfo.label}
          </span>
        </td>
        <td class="cell-file-progress">
          <div class="progress-wrapper">
            <div class="progress-label-row">
              <span>${percentualStr}</span>
              <span>${isComplete ? '100%' : ''}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${Math.min(100, Math.max(0, percentualNum))}%;"></div>
            </div>
          </div>
        </td>
      `;

      fragment.appendChild(tr);
    }

    // Espaçador virtual inferior
    if (bottomPadding > 0) {
      const spacerBottom = document.createElement('tr');
      spacerBottom.className = 'virtual-spacer-row';
      spacerBottom.style.height = `${bottomPadding}px`;
      spacerBottom.innerHTML = `<td colspan="7" style="height: ${bottomPadding}px; padding: 0; margin: 0; border: none;"></td>`;
      fragment.appendChild(spacerBottom);
    }

    filesTableBody.innerHTML = '';
    filesTableBody.appendChild(fragment);
    atualizarResumoSelecao();
  }

  // Listener de Scroll com requestAnimationFrame a 60 FPS
  filesScrollArea?.addEventListener('scroll', () => {
    if (scrollRafId) cancelAnimationFrame(scrollRafId);
    scrollRafId = requestAnimationFrame(() => {
      renderizarTabelaArquivosVirtualizada();
    });
  }, { passive: true });

  // ==========================================
  // ETAPA 5: SELEÇÃO E VISUALIZAÇÃO DOS ARQUIVOS
  // ==========================================
  async function selecionarTorrent(torrent) {
    torrentSelecionadoAtual = torrent;

    // Destaca a linha selecionada na tabela de torrents
    document.querySelectorAll('.torrent-row').forEach((r) => {
      r.classList.toggle('selected', r.dataset.hash === torrent.hash);
    });

    // Exibe a seção de arquivos e limpa a pesquisa
    torrentFilesSection.style.display = 'flex';
    selectedTorrentName.textContent = torrent.name;
    selectedTorrentMeta.textContent = `Tamanho total: ${formatarTamanho(torrent.size)}`;
    
    if (inputSearchFiles) {
      inputSearchFiles.value = '';
    }
    if (filterHideIgnored) {
      filterHideIgnored.checked = false;
    }
    if (filterOnlySelected) {
      filterOnlySelected.checked = false;
    }
    if (btnClearSearch) {
      btnClearSearch.style.display = 'none';
    }

    const statusInfo = mapearStatusLegivel(torrent.status, torrent.rawState);
    selectedTorrentStatus.textContent = statusInfo.label;
    filesHashTag.textContent = `Hash: ${torrent.hash}`;
    filesCountText.textContent = 'Carregando arquivos do torrent...';
    searchResultCount.textContent = 'Carregando lista...';

    // Estado de carregamento na tabela
    filesTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h4>Carregando arquivos...</h4>
            <p>Buscando todos os arquivos de "${torrent.name}"...</p>
          </div>
        </td>
      </tr>
    `;

    // Rola suavemente até a seção de arquivos
    torrentFilesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const res = await fetch(`/api/torrents/${encodeURIComponent(torrent.hash)}/files`);
      const data = await res.json();

      if (res.ok && data.sucesso) {
        todosArquivosDoTorrent = data.files || [];
        
        // Pré-processamento e indexação instantânea em O(N) para 50.000+ arquivos
        arquivosSelecionadosIndices = new Set();
        todosArquivosDoTorrent.forEach((f, idx) => {
          f._fileIndex = f.index !== undefined ? f.index : idx;
          f._searchLower = ((f.name || '') + ' ' + (f.path || '')).toLowerCase();

          // Arquivos com prioridade > 0 começam marcados; prioridade 0 (não baixar) começam desmarcados
          if (f.priority !== 0) {
            arquivosSelecionadosIndices.add(f._fileIndex);
          }
        });

        selectedTorrentMeta.textContent = `${todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos • ${formatarTamanho(torrent.size)} no total`;

        termoBuscaAtual = '';
        arquivosFiltradosAtuais = todosArquivosDoTorrent;
        if (filesScrollArea) filesScrollArea.scrollTop = 0;

        renderizarTabelaArquivosVirtualizada();

        mostrarToast(
          'Arquivos Carregados',
          `${todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos carregados com sucesso (Virtualização Ativa).`,
          'success'
        );
      } else {
        todosArquivosDoTorrent = [];
        arquivosSelecionadosIndices.clear();
        filesCountText.textContent = 'Erro ao carregar arquivos';
        searchResultCount.textContent = '0 arquivos';
        filesTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="7">
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>Falha ao carregar arquivos</h4>
                <p>${data.erro || 'Não foi possível carregar os arquivos deste torrent.'}</p>
              </div>
            </td>
          </tr>
        `;
        atualizarResumoSelecao();
        mostrarToast('Erro', data.erro || 'Falha ao carregar arquivos do torrent.', 'error');
      }
    } catch (err) {
      todosArquivosDoTorrent = [];
      arquivosSelecionadosIndices.clear();
      filesCountText.textContent = 'Erro de comunicação';
      searchResultCount.textContent = 'Erro';
      filesTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">✕</div>
              <h4>Erro de rede</h4>
              <p>${err.message}</p>
            </div>
          </td>
        </tr>
      `;
      atualizarResumoSelecao();
      mostrarToast('Erro de Rede', err.message, 'error');
    }
  }

  // Fechar visualização de arquivos
  btnFecharArquivos?.addEventListener('click', () => {
    torrentFilesSection.style.display = 'none';
    torrentSelecionadoAtual = null;
    todosArquivosDoTorrent = [];
    arquivosSelecionadosIndices.clear();
    document.querySelectorAll('.torrent-row').forEach((r) => r.classList.remove('selected'));
  });

  // ==========================================
  // ETAPA 4: LISTAGEM DE TORRENTS
  // ==========================================
  async function carregarTorrents(isManual = false) {
    if (isManual) {
      btnRecarregarTorrents.disabled = true;
      refreshIcon.classList.add('spin-animation');
      btnRecarregarText.textContent = 'Atualizando...';
    }

    try {
      const res = await fetch('/api/torrents');
      const data = await res.json();

      const agora = new Date();
      const horaStr = agora.toLocaleTimeString('pt-BR');
      lastSyncTime.textContent = `Última sincronização: ${horaStr}`;

      if (res.ok && data.sucesso) {
        const torrents = data.torrents || [];
        
        // Atualiza estatísticas no topo
        statTotalTorrents.textContent = torrents.length;
        
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

        statCompletedTorrents.textContent = countCompleted;
        statDownloadingTorrents.textContent = countDownloading;
        statPausedTorrents.textContent = countPaused;
        statTotalSize.textContent = formatarTamanho(bytesTotal);

        tableCountText.textContent = torrents.length === 1
          ? '1 torrent carregado'
          : `${torrents.length} torrents carregados do ${activeClientName.textContent}`;

        // Renderiza linhas da tabela
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

            const isSelected = torrentSelecionadoAtual && torrentSelecionadoAtual.hash === t.hash;

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
        tableCountText.textContent = 'Erro ao listar torrents';
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
        if (isManual) {
          mostrarToast('Erro ao Atualizar', data.erro || 'Não foi possível carregar a lista de torrents.', 'error');
        }
      }
    } catch (err) {
      tableCountText.textContent = 'Erro de comunicação';
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
      if (isManual) {
        mostrarToast('Erro de Rede', err.message, 'error');
      }
    } finally {
      if (isManual) {
        setTimeout(() => {
          btnRecarregarTorrents.disabled = false;
          refreshIcon.classList.remove('spin-animation');
          btnRecarregarText.textContent = 'Atualizar Torrents';
        }, 300);
      }
    }
  }

  // Evento de clique: Atualização Manual
  btnRecarregarTorrents?.addEventListener('click', () => {
    carregarTorrents(true);
  });

  // Carrega configurações e status geral
  async function carregarDados() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();

        systemStatusBadge.className = 'badge status-pill active';
        systemStatusText.textContent = data.mensagem || 'Aplicação iniciada';
        
        if (data.clienteAtivo) {
          activeClientName.textContent = data.clienteAtivo;
          statClientName.textContent = data.clienteAtivo;
        }

        // Preenche campos do formulário com as configurações salvas
        if (data.config) {
          if (!inputHost.value) inputHost.value = data.config.host || 'localhost';
          if (!inputPort.value) inputPort.value = data.config.port || 8877;
          if (!inputUsername.value && data.config.username) inputUsername.value = data.config.username;
          if (inputRefreshInterval) inputRefreshInterval.value = data.config.refreshInterval !== undefined ? data.config.refreshInterval : 10;
          if (inputTimeoutMs) inputTimeoutMs.value = data.config.timeoutMs || 5000;
          inputHttps.checked = Boolean(data.config.useHttps);

          if (data.config.hasPassword && !inputPassword.value) {
            inputPassword.placeholder = '•••••••• (senha salva)';
          }

          const proto = inputHttps.checked ? 'https' : 'http';
          infoEndpoint.textContent = `${proto}://${inputHost.value}:${inputPort.value}`;

          configurarAutoRefresh(data.config.refreshInterval !== undefined ? data.config.refreshInterval : 10);
        }

        const isConectado = data.statusConexao?.conectado;
        isConectadoCliente = Boolean(isConectado);
        if (isConectado) {
          statConnectionStatus.textContent = 'Conectado';
          statConnectionStatus.style.color = '#34d399';
          statAppVersion.textContent = data.infoCliente?.appVersion || 'v5.x';
          statWebApiVersion.textContent = data.infoCliente?.webApiVersion || 'v2.x';
          infoAppVersion.textContent = data.infoCliente?.appVersion || 'v5.x';
          infoWebApiVersion.textContent = data.infoCliente?.webApiVersion || 'v2.x';
          infoCookieStatus.textContent = 'Ativo (Autenticado SID)';
          infoCookieStatus.style.color = '#34d399';
          btnDesconectar.style.display = 'inline-flex';

          setFeedback(
            'success',
            'Conexão ativa com o qBittorrent',
            data.statusConexao?.detalhes || 'Autenticação e sessão SID validadas com sucesso.'
          );
        } else {
          statConnectionStatus.textContent = 'Desconectado';
          statConnectionStatus.style.color = '#fb7185';
          statAppVersion.textContent = '—';
          statWebApiVersion.textContent = '—';
          infoAppVersion.textContent = '—';
          infoWebApiVersion.textContent = '—';
          infoCookieStatus.textContent = 'Inativo';
          infoCookieStatus.style.color = '#94a3b8';
          btnDesconectar.style.display = 'none';

          if (data.statusConexao?.detalhes && data.statusConexao.detalhes !== 'Não conectado') {
            setFeedback(
              'error',
              'Não foi possível conectar',
              data.statusConexao.detalhes
            );
          } else {
            setFeedback(
              'idle',
              'Pronto para conexão',
              'Credenciais prontas. Clique em "Conectar ao qBittorrent" para iniciar a sessão.'
            );
          }
        }
      }
    } catch (err) {
      systemStatusBadge.className = 'badge status-pill offline';
      systemStatusText.textContent = 'API Inacessível';
      setFeedback('error', 'Erro de Servidor', `Não foi possível contatar o backend local: ${err.message}`);
    }
  }

  // Ação: Submeter formulário de conexão
  formConnection?.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnConectar.disabled = true;
    btnConectarText.textContent = 'Autenticando...';

    const payload = {
      host: inputHost.value.trim() || 'localhost',
      port: Number(inputPort.value) || 8877,
      username: inputUsername.value.trim(),
      password: inputPassword.value || undefined,
      useHttps: inputHttps.checked,
      salvarConfig: inputSaveConfig.checked,
    };

    const proto = payload.useHttps ? 'https' : 'http';
    infoEndpoint.textContent = `${proto}://${payload.host}:${payload.port}`;

    try {
      const response = await fetch('/api/client/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        mostrarToast('Conexão Estabelecida', data.mensagem || 'Conectado com sucesso ao qBittorrent!', 'success');
        setFeedback(
          'success',
          'Autenticado com sucesso!',
          data.infoCliente
            ? `Versão qBittorrent: ${data.infoCliente.appVersion} | Web API: ${data.infoCliente.webApiVersion} | Host: ${data.infoCliente.urlBase}`
            : data.mensagem
        );
      } else {
        const msgErro = data.erro || data.mensagem || 'Não foi possível conectar ao qBittorrent.';
        mostrarToast('Falha na Autenticação', msgErro, 'error');
        setFeedback('error', 'Falha ao conectar', msgErro);
      }

      await carregarDados();
      await carregarTorrents();
    } catch (err) {
      mostrarToast('Erro de Rede', `Falha ao enviar requisição: ${err.message}`, 'error');
      setFeedback('error', 'Erro ao conectar', `Erro de comunicação: ${err.message}`);
    } finally {
      btnConectar.disabled = false;
      btnConectarText.textContent = 'Conectar ao qBittorrent';
    }
  });

  // Ação: Salvar configurações apenas
  btnSalvarConfig?.addEventListener('click', async () => {
    btnSalvarConfig.disabled = true;
    try {
      const payload = {
        host: inputHost.value.trim() || 'localhost',
        port: Number(inputPort.value) || 8877,
        username: inputUsername.value.trim(),
        password: inputPassword.value || undefined,
        useHttps: inputHttps.checked,
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        mostrarToast('Configurações Salvas', 'As configurações foram salvas em data/config.json com sucesso!', 'success');
      } else {
        mostrarToast('Erro ao Salvar', data.erro || 'Falha ao salvar configurações', 'error');
      }
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    } finally {
      btnSalvarConfig.disabled = false;
    }
  });

  // Ação: Reverificar conexão
  btnTestarConexao?.addEventListener('click', async () => {
    btnTestarConexao.disabled = true;
    try {
      const response = await fetch('/api/client/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok && data.sucesso) {
        mostrarToast('Status Atualizado', 'Conexão confirmada com sucesso!', 'success');
      } else {
        mostrarToast('Aviso', data.erro || data.mensagem, 'error');
      }
      await carregarDados();
      await carregarTorrents();
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    } finally {
      btnTestarConexao.disabled = false;
    }
  });

  // Ação: Desconectar
  btnDesconectar?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/client/disconnect', { method: 'POST' });
      if (res.ok) {
        mostrarToast('Desconectado', 'Sessão encerrada com o cliente.', 'info');
        torrentFilesSection.style.display = 'none';
        torrentSelecionadoAtual = null;
        todosArquivosDoTorrent = [];
        arquivosSelecionadosIndices.clear();
        await carregarDados();
        await carregarTorrents();
      }
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    }
  });

  // ==========================================
  // ETAPA 9: APLICAÇÃO DAS PRIORIDADES NO CLIENTE
  // ==========================================
  btnSalvarPrioridades?.addEventListener('click', async () => {
    if (!torrentSelecionadoAtual || todosArquivosDoTorrent.length === 0) {
      mostrarToast('Aviso', 'Nenhum torrent ou arquivo selecionado para aplicar prioridades.', 'info');
      return;
    }

    const marcadosIndices = [];
    const desmarcadosIndices = [];

    todosArquivosDoTorrent.forEach((f, idx) => {
      const fileIndex = f.index !== undefined ? f.index : idx;
      if (arquivosSelecionadosIndices.has(fileIndex)) {
        marcadosIndices.push(fileIndex);
      } else {
        desmarcadosIndices.push(fileIndex);
      }
    });

    btnSalvarPrioridades.disabled = true;
    if (savePrioIcon) savePrioIcon.classList.add('spin-animation');
    if (btnSalvarPrioridadesText) btnSalvarPrioridadesText.textContent = 'Enviando ao qBittorrent...';

    try {
      const hash = torrentSelecionadoAtual.hash;
      const response = await fetch(`/api/torrents/${encodeURIComponent(hash)}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marcadosIndices,
          desmarcadosIndices,
        }),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        mostrarToast(
          'Prioridades Aplicadas!',
          `${marcadosIndices.length} arquivos marcados como Normal (1) e ${desmarcadosIndices.length} como Não Baixar (0).`,
          'success'
        );

        setFeedback(
          'success',
          'Prioridades Atualizadas no qBittorrent',
          `As prioridades do torrent "${torrentSelecionadoAtual.name}" foram sincronizadas com sucesso com o cliente BitTorrent.`
        );

        // Recarrega os arquivos do qBittorrent para sincronizar a interface com o estado real do cliente
        await selecionarTorrent(torrentSelecionadoAtual);
      } else {
        const msgErro = data.erro || 'Falha ao aplicar prioridades no qBittorrent.';
        mostrarToast('Erro ao Aplicar', msgErro, 'error');
        setFeedback('error', 'Falha ao aplicar prioridades', msgErro);
      }
    } catch (err) {
      mostrarToast('Erro de Rede', `Falha de comunicação: ${err.message}`, 'error');
      setFeedback('error', 'Erro de Comunicação', err.message);
    } finally {
      btnSalvarPrioridades.disabled = false;
      if (savePrioIcon) savePrioIcon.classList.remove('spin-animation');
      if (btnSalvarPrioridadesText) btnSalvarPrioridadesText.textContent = 'Aplicar Prioridades';
    }
  });

  // ==========================================
  // ETAPA 11: GERENCIAMENTO DE CONFIGURAÇÕES & AUTO-REFRESH
  // ==========================================
  let timerAutoRefresh = null;
  let autoRefreshSegundos = 10;
  let isConectadoCliente = false;

  function configurarAutoRefresh(segundos) {
    if (timerAutoRefresh) {
      clearInterval(timerAutoRefresh);
      timerAutoRefresh = null;
    }

    autoRefreshSegundos = Number(segundos) || 0;

    if (infoAutoRefreshStatus) {
      infoAutoRefreshStatus.textContent = autoRefreshSegundos > 0
        ? `A cada ${autoRefreshSegundos}s`
        : 'Desativado';
      infoAutoRefreshStatus.style.color = autoRefreshSegundos > 0 ? '#38bdf8' : '#94a3b8';
    }

    if (autoRefreshSegundos > 0) {
      timerAutoRefresh = setInterval(async () => {
        if (isConectadoCliente && !torrentFilesSection.style.display || torrentFilesSection.style.display === 'none') {
          await carregarTorrents(false);
        }
      }, autoRefreshSegundos * 1000);
    }
  }

  async function abrirModalConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();

      if (res.ok && data.config?.qbittorrent) {
        const qb = data.config.qbittorrent;
        if (inputModalHost) inputModalHost.value = qb.host || 'localhost';
        if (inputModalPort) inputModalPort.value = qb.port || 8877;
        if (inputModalUsername) inputModalUsername.value = qb.username || 'admin';
        if (inputModalRefreshInterval) inputModalRefreshInterval.value = qb.refreshInterval !== undefined ? qb.refreshInterval : 10;
        if (inputModalTimeout) inputModalTimeout.value = qb.timeoutMs || 5000;
        if (inputModalHttps) inputModalHttps.checked = Boolean(qb.useHttps);

        if (inputModalPassword) {
          inputModalPassword.value = '';
          inputModalPassword.placeholder = qb.hasPassword ? '•••••••• (senha salva)' : 'Digite a senha';
        }
      }
    } catch {
      // Usa valores atuais do formulário caso a requisição falhe
      if (inputModalHost) inputModalHost.value = inputHost?.value || 'localhost';
      if (inputModalPort) inputModalPort.value = inputPort?.value || 8877;
      if (inputModalUsername) inputModalUsername.value = inputUsername?.value || 'admin';
    }

    if (modalConfiguracoes) {
      modalConfiguracoes.style.display = 'flex';
      if (inputModalHost) inputModalHost.focus();
    }
  }

  function fecharModalConfig() {
    if (modalConfiguracoes) {
      modalConfiguracoes.style.display = 'none';
    }
  }

  btnAbrirConfigModal?.addEventListener('click', abrirModalConfig);
  btnFecharModalConfig?.addEventListener('click', fecharModalConfig);

  // Fecha modal ao clicar fora do card
  modalConfiguracoes?.addEventListener('click', (e) => {
    if (e.target === modalConfiguracoes) {
      fecharModalConfig();
    }
  });

  // Fecha modal com tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalConfiguracoes && modalConfiguracoes.style.display === 'flex') {
      fecharModalConfig();
    }
  });

  // Restaurar valores padrão no modal
  btnModalRestaurar?.addEventListener('click', () => {
    if (inputModalHost) inputModalHost.value = 'localhost';
    if (inputModalPort) inputModalPort.value = 8877;
    if (inputModalUsername) inputModalUsername.value = 'admin';
    if (inputModalPassword) {
      inputModalPassword.value = 'Ozzy261220';
      inputModalPassword.placeholder = 'Ozzy261220';
    }
    if (inputModalRefreshInterval) inputModalRefreshInterval.value = '10';
    if (inputModalTimeout) inputModalTimeout.value = 5000;
    if (inputModalHttps) inputModalHttps.checked = false;

    mostrarToast('Padrões Carregados', 'Valores padrão do qBittorrent preenchidos nos campos.', 'info');
  });

  // Testar conexão a partir do modal
  btnModalTestar?.addEventListener('click', async () => {
    btnModalTestar.disabled = true;
    const textoOriginal = btnModalTestar.innerHTML;
    btnModalTestar.innerHTML = '<span>Testando...</span>';

    const payload = {
      host: inputModalHost?.value.trim() || 'localhost',
      port: Number(inputModalPort?.value) || 8877,
      username: inputModalUsername?.value.trim(),
      password: inputModalPassword?.value || undefined,
      useHttps: Boolean(inputModalHttps?.checked),
      timeoutMs: Number(inputModalTimeout?.value) || 5000,
      refreshInterval: Number(inputModalRefreshInterval?.value) || 10,
    };

    try {
      const response = await fetch('/api/client/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        mostrarToast('Teste Bem-sucedido', data.mensagem || 'Conectado com sucesso ao qBittorrent!', 'success');
      } else {
        mostrarToast('Falha no Teste', data.erro || 'Não foi possível autenticar no qBittorrent.', 'error');
      }
    } catch (err) {
      mostrarToast('Erro de Rede', `Falha ao testar conexão: ${err.message}`, 'error');
    } finally {
      btnModalTestar.disabled = false;
      btnModalTestar.innerHTML = textoOriginal;
    }
  });

  // Salvar configurações do modal
  formModalConfig?.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnModalSalvar.disabled = true;
    const textoSalvar = btnModalSalvar.innerHTML;
    btnModalSalvar.innerHTML = '<span>Salvando...</span>';

    const payload = {
      host: inputModalHost?.value.trim() || 'localhost',
      port: Number(inputModalPort?.value) || 8877,
      username: inputModalUsername?.value.trim(),
      password: inputModalPassword?.value || undefined,
      useHttps: Boolean(inputModalHttps?.checked),
      timeoutMs: Number(inputModalTimeout?.value) || 5000,
      refreshInterval: Number(inputModalRefreshInterval?.value) ?? 10,
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        mostrarToast('Configurações Salvas', 'Configurações persistidas em data/config.json com sucesso!', 'success');
        fecharModalConfig();

        configurarAutoRefresh(payload.refreshInterval);
        await carregarDados();
        await carregarTorrents();
      } else {
        mostrarToast('Erro ao Salvar', data.erro || 'Falha ao salvar configurações.', 'error');
      }
    } catch (err) {
      mostrarToast('Erro de Rede', err.message, 'error');
    } finally {
      btnModalSalvar.disabled = false;
      btnModalSalvar.innerHTML = textoSalvar;
    }
  });

  // Carregamento inicial da página
  await carregarDados();
  await carregarTorrents();
});
