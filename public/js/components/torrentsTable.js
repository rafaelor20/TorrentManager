/**
 * Componente da Tabela de Torrents e Estatísticas Rápidas
 * Recursos:
 * - Separação e Filtragem por Categorias (Pílulas dinâmicas e Agrupamento por Categoria)
 * - Filtragem Instantânea por Status ao clicar nos cards de estatísticas acima
 * - Pesquisa Instantânea de Torrents por Nome, Categoria e Hash
 * - Ordenação Inteligente por Coluna (Nome, Categoria, Status, Progresso, Tamanho, Velocidade)
 * - Indicadores visuais de ordenação (▲ / ▼ / ↕), categoria e filtro ativo
 * - Sincronização em tempo real e atualização de estatísticas
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { formatarTamanho, formatarVelocidade, mapearStatusLegivel, normalizarTextoBusca, extrairTokensBusca } from '../utils/formatters.js';
import { mostrarToast } from './toast.js';
import { selecionarTorrent } from './filesManager.js';

// ==========================================
// 1. FILTRAGEM DE TORRENTS (STATUS, CATEGORIA & BUSCA)
// ==========================================

export function obterTorrentsVisiveis() {
  const lista = state.todosTorrents || [];
  if (lista.length === 0) return [];

  const filtroStatus = state.filtroTorrentsStatus || 'all';
  const filtroCat = state.filtroTorrentsCategoria || 'all';
  const termo = (state.termoBuscaTorrents || '').trim();
  const tokensBusca = extrairTokensBusca(termo);

  const filtrados = lista.filter((t) => {
    // 1. Filtro por status
    if (filtroStatus === 'completed') {
      const isCompleted = t.status === 'uploading' || t.status === 'completed' || (typeof t.progress === 'number' && t.progress >= 1);
      if (!isCompleted) return false;
    } else if (filtroStatus === 'downloading') {
      if (t.status !== 'downloading') return false;
    } else if (filtroStatus === 'paused') {
      if (t.status !== 'paused') return false;
    }

    // 2. Filtro por categoria
    if (filtroCat !== 'all') {
      if (filtroCat === '__none__') {
        if (t.category && t.category.trim().length > 0) return false;
      } else {
        if ((t.category || '').trim() !== filtroCat) return false;
      }
    }

    // 3. Filtro por busca de texto (nome, categoria e hash)
    if (tokensBusca.length > 0) {
      const searchStr = normalizarTextoBusca(`${t.name || ''} ${t.category || ''} ${t.hash || ''}`);
      for (let i = 0; i < tokensBusca.length; i++) {
        if (!searchStr.includes(tokensBusca[i])) {
          return false;
        }
      }
    }

    return true;
  });

  if (state.modoConsolidadoCategoria) {
    const consolidados = gerarTorrentsConsolidadosPorCategoria(filtrados);
    return ordenarTorrents(consolidados);
  }

  return ordenarTorrents(filtrados);
}

export function atualizarIndicadoresFiltroStatusTorrentsUI() {
  const current = state.filtroTorrentsStatus || 'all';
  document.querySelectorAll('#torrentStatusStatsGrid .stat-box').forEach((box) => {
    const filter = box.dataset.filter;
    box.classList.toggle('is-active', filter === current);
  });
}

export function definirFiltroStatusTorrents(novoFiltro) {
  if (state.filtroTorrentsStatus === novoFiltro && novoFiltro !== 'all') {
    state.filtroTorrentsStatus = 'all';
  } else {
    state.filtroTorrentsStatus = novoFiltro || 'all';
  }

  atualizarIndicadoresFiltroStatusTorrentsUI();
  renderizarTabelaTorrents();

  const labels = {
    all: 'Todos os Torrents',
    completed: 'Concluídos / Upload',
    downloading: 'Em Download',
    paused: 'Pausados',
  };
  mostrarToast('Filtro de Status', `Filtro ativo: ${labels[state.filtroTorrentsStatus] || state.filtroTorrentsStatus}`, 'info');
}

export function atualizarPilulasCategoriasUI() {
  const container = document.getElementById('torrentCategoryPillsContainer');
  const pillsList = document.getElementById('torrentCategoryPillsList');
  if (!container || !pillsList) return;

  const todos = state.todosTorrents || [];
  if (todos.length === 0) {
    container.style.display = 'none';
    return;
  }

  const contagens = new Map();
  let countSemCat = 0;

  todos.forEach((t) => {
    const cat = t.category && t.category.trim();
    if (cat) {
      contagens.set(cat, (contagens.get(cat) || 0) + 1);
    } else {
      countSemCat++;
    }
  });

  const categoriasUnicas = Array.from(contagens.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  state.categoriasDisponiveis = categoriasUnicas;

  // Se não houver categorias registradas nos torrents, oculta a barra de pílulas
  if (categoriasUnicas.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  const filtroAtual = state.filtroTorrentsCategoria || 'all';

  let pillsHtml = `
    <button type="button" class="category-pill ${filtroAtual === 'all' ? 'is-active' : ''}" data-category="all">
      <span>Todos</span>
      <span class="category-pill-count">${todos.length}</span>
    </button>
  `;

  categoriasUnicas.forEach((cat) => {
    const count = contagens.get(cat) || 0;
    const isActive = filtroAtual === cat;
    pillsHtml += `
      <button type="button" class="category-pill ${isActive ? 'is-active' : ''}" data-category="${cat}">
        <span>📁 ${cat}</span>
        <span class="category-pill-count">${count}</span>
      </button>
    `;
  });

  if (countSemCat > 0) {
    const isActive = filtroAtual === '__none__';
    pillsHtml += `
      <button type="button" class="category-pill ${isActive ? 'is-active' : ''}" data-category="__none__">
        <span>Sem Categoria</span>
        <span class="category-pill-count">${countSemCat}</span>
      </button>
    `;
  }

  pillsList.innerHTML = pillsHtml;
}

export function definirFiltroCategoriaTorrents(cat) {
  if (state.filtroTorrentsCategoria === cat && cat !== 'all') {
    state.filtroTorrentsCategoria = 'all';
  } else {
    state.filtroTorrentsCategoria = cat || 'all';
  }

  atualizarPilulasCategoriasUI();
  renderizarTabelaTorrents();

  const label = state.filtroTorrentsCategoria === 'all'
    ? 'Todas as Categorias'
    : (state.filtroTorrentsCategoria === '__none__' ? 'Sem Categoria' : state.filtroTorrentsCategoria);

  mostrarToast('Filtro de Categoria', `Exibindo categoria: ${label}`, 'info');
}

export function alternarAgrupamentoPorCategoria() {
  state.agruparPorCategoria = !state.agruparPorCategoria;

  if (state.agruparPorCategoria && state.modoConsolidadoCategoria) {
    state.modoConsolidadoCategoria = false;
    const btnConsolidar = document.getElementById('btnToggleConsolidatedCategory');
    const btnConsolidarText = document.getElementById('btnToggleConsolidatedCategoryText');
    if (btnConsolidar) btnConsolidar.classList.remove('is-active');
    if (btnConsolidarText) btnConsolidarText.textContent = 'Fundir como 1 Torrent';
  }

  const btnToggle = document.getElementById('btnToggleCategoryGroup');
  const btnToggleText = document.getElementById('btnToggleCategoryGroupText');

  if (btnToggle) {
    btnToggle.classList.toggle('is-active', state.agruparPorCategoria);
  }
  if (btnToggleText) {
    btnToggleText.textContent = state.agruparPorCategoria ? '✓ Agrupado por Categoria' : 'Agrupar por Categoria';
  }

  renderizarTabelaTorrents();

  mostrarToast(
    'Visualização de Torrents',
    state.agruparPorCategoria ? 'Torrents agrupados por categoria.' : 'Visualização linear da lista de torrents.',
    'info'
  );
}

export function alternarModoConsolidadoCategoria() {
  state.modoConsolidadoCategoria = !state.modoConsolidadoCategoria;

  if (state.modoConsolidadoCategoria && state.agruparPorCategoria) {
    state.agruparPorCategoria = false;
    const btnGroup = document.getElementById('btnToggleCategoryGroup');
    const btnGroupText = document.getElementById('btnToggleCategoryGroupText');
    if (btnGroup) btnGroup.classList.remove('is-active');
    if (btnGroupText) btnGroupText.textContent = 'Agrupar por Categoria';
  }

  const btnConsolidar = document.getElementById('btnToggleConsolidatedCategory');
  const btnConsolidarText = document.getElementById('btnToggleConsolidatedCategoryText');

  if (btnConsolidar) {
    btnConsolidar.classList.toggle('is-active', state.modoConsolidadoCategoria);
  }
  if (btnConsolidarText) {
    btnConsolidarText.textContent = state.modoConsolidadoCategoria ? '✓ Categorias como 1 Torrent' : 'Fundir como 1 Torrent';
  }

  renderizarTabelaTorrents();

  mostrarToast(
    'Modo Categoria Unificada',
    state.modoConsolidadoCategoria
      ? 'Torrents de cada categoria consolidados como 1 torrent virtual unificado.'
      : 'Visualização normal de torrents individuais.',
    'info'
  );
}

export function gerarTorrentsConsolidadosPorCategoria(torrents) {
  if (!torrents || torrents.length === 0) return [];

  const grupos = new Map();

  torrents.forEach((t) => {
    const catKey = (t.category && t.category.trim()) || '__none__';
    if (!grupos.has(catKey)) {
      grupos.set(catKey, []);
    }
    grupos.get(catKey).push(t);
  });

  const consolidados = [];

  grupos.forEach((membros, catKey) => {
    const catNome = catKey === '__none__' ? 'Sem Categoria' : catKey;
    let bytesTotal = 0;
    let downloadSpeedTotal = 0;
    let uploadSpeedTotal = 0;
    let bytesBaixadosTotal = 0;
    let hasDownloading = false;
    let hasPaused = false;
    let allCompleted = true;

    membros.forEach((t) => {
      const size = Number(t.size || 0);
      bytesTotal += size;
      downloadSpeedTotal += Number(t.downloadSpeed || 0);
      uploadSpeedTotal += Number(t.uploadSpeed || 0);

      const prog = typeof t.progress === 'number' ? (t.progress > 1 ? t.progress / 100 : t.progress) : 0;
      bytesBaixadosTotal += size * prog;

      if (t.status === 'downloading') hasDownloading = true;
      if (t.status === 'paused') hasPaused = true;
      if (t.status !== 'completed' && t.status !== 'uploading' && prog < 1) allCompleted = false;
    });

    const progressoConsolidado = bytesTotal > 0 ? (bytesBaixadosTotal / bytesTotal) : (allCompleted ? 1 : 0);

    let statusConsolidado = 'paused';
    if (hasDownloading) {
      statusConsolidado = 'downloading';
    } else if (allCompleted) {
      statusConsolidado = 'completed';
    } else if (hasPaused) {
      statusConsolidado = 'paused';
    } else {
      statusConsolidado = membros[0]?.status || 'downloading';
    }

    consolidados.push({
      id: `cat-virtual-${catKey}`,
      hash: `cat-virtual-${catKey}`,
      name: `📁 ${catNome}`,
      category: catKey === '__none__' ? '' : catKey,
      isCategoryVirtual: true,
      categoryName: catNome,
      torrentsList: membros,
      size: bytesTotal,
      progress: progressoConsolidado,
      status: statusConsolidado,
      downloadSpeed: downloadSpeedTotal,
      uploadSpeed: uploadSpeedTotal,
      rawState: statusConsolidado,
    });
  });

  return consolidados;
}

export function filtrarTorrentsInstantaneamente() {
  const inputSearch = document.getElementById('inputSearchTorrents');
  const btnClear = document.getElementById('btnClearTorrentSearch');

  const termo = (inputSearch?.value || '').trim();
  state.termoBuscaTorrents = termo;

  if (btnClear) {
    btnClear.style.display = termo.length > 0 ? 'flex' : 'none';
  }

  renderizarTabelaTorrents();
}

// ==========================================
// 2. ORDENAÇÃO DE TORRENTS (SORTING)
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
    category: 'Categoria',
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
      case 'category': {
        const catA = String(a.category || 'Sem Categoria');
        const catB = String(b.category || 'Sem Categoria');
        const comp = catA.localeCompare(catB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return comp * mult;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
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
// 3. RENDERIZAÇÃO DA TABELA DE TORRENTS
// ==========================================

function renderizarLinhaTorrent(t) {
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
  const catNome = t.categoryName || (t.category ? t.category.trim() : '');

  const isVirtual = Boolean(t.isCategoryVirtual);
  const hashSub = isVirtual
    ? `${t.torrentsList.length} torrents consolidados • Clique para ver todos os arquivos`
    : (t.hash ? t.hash.substring(0, 10) + '...' : '');

  const btnText = isSelected
    ? '✓ Selecionado'
    : (isVirtual ? `Ver ${t.torrentsList.length} Torrents` : 'Ver Arquivos');

  return `
    <tr class="torrent-row ${isSelected ? 'selected' : ''} ${isVirtual ? 'is-virtual-category-row' : ''}" data-hash="${t.hash}">
      <td class="cell-action">
        <button class="btn btn-outline btn-xs btn-select-torrent" title="Ver arquivos deste item">
          <span>${btnText}</span>
        </button>
      </td>
      <td class="cell-name">
        <span class="torrent-name-text" title="${t.name}">${t.name}</span>
        <span class="torrent-hash-sub">${hashSub}</span>
      </td>
      <td class="cell-category">
        ${catNome ? `<span class="category-badge" title="Categoria: ${catNome}">📁 ${catNome}</span>` : '<span class="category-badge category-badge-none">Sem Categoria</span>'}
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
}

export function renderizarTabelaTorrents() {
  const torrentsTableBody = document.getElementById('torrentsTableBody');
  const tableCountText = document.getElementById('tableCountText');
  const torrentSearchResultCount = document.getElementById('torrentSearchResultCount');
  const activeClientName = document.getElementById('activeClientName');

  if (!torrentsTableBody) return;

  const totalOriginal = (state.todosTorrents || []).length;
  const torrentsVisiveis = obterTorrentsVisiveis();
  const totalFiltrado = torrentsVisiveis.length;
  const clientNome = activeClientName ? activeClientName.textContent : 'qBittorrent';

  const temFiltroAtivo = Boolean(
    state.termoBuscaTorrents ||
    state.filtroTorrentsStatus !== 'all' ||
    state.filtroTorrentsCategoria !== 'all'
  );

  // Atualiza contadores e badges de status
  if (torrentSearchResultCount) {
    if (temFiltroAtivo) {
      torrentSearchResultCount.textContent = `Exibindo ${totalFiltrado} de ${totalOriginal} torrents`;
    } else {
      torrentSearchResultCount.textContent = totalOriginal === 1
        ? '1 torrent carregado'
        : `Exibindo todos os ${totalOriginal} torrents`;
    }
  }

  if (tableCountText) {
    if (temFiltroAtivo) {
      tableCountText.textContent = `Exibindo ${totalFiltrado} de ${totalOriginal} torrents filtrados`;
    } else {
      tableCountText.textContent = totalOriginal === 1
        ? '1 torrent carregado'
        : `${totalOriginal} torrents carregados do ${clientNome}`;
    }
  }

  if (totalOriginal === 0) {
    torrentsTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="7">
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

  if (totalFiltrado === 0) {
    torrentsTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h4>Nenhum torrent corresponde aos filtros</h4>
            <p>Tente alterar a categoria, o status selecionado ou ajustar o termo de pesquisa.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';

  if (state.agruparPorCategoria) {
    // Agrupa os torrents visíveis por categoria
    const grupos = new Map();

    torrentsVisiveis.forEach((t) => {
      const catKey = (t.category && t.category.trim()) || '__none__';
      if (!grupos.has(catKey)) {
        grupos.set(catKey, []);
      }
      grupos.get(catKey).push(t);
    });

    const chavesOrdenadas = Array.from(grupos.keys()).sort((a, b) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });

    chavesOrdenadas.forEach((catKey) => {
      const listaDoGrupo = grupos.get(catKey) || [];
      const catNome = catKey === '__none__' ? 'Sem Categoria' : catKey;
      let totalBytesGrupo = 0;
      listaDoGrupo.forEach((t) => { totalBytesGrupo += (t.size || 0); });

      html += `
        <tr class="category-group-row">
          <td colspan="7">
            <div class="category-group-header">
              <span class="category-group-icon">📁</span>
              <span class="category-group-name">${catNome}</span>
              <span class="category-group-count">${listaDoGrupo.length} torrent${listaDoGrupo.length === 1 ? '' : 's'}</span>
              <span class="category-group-size">${formatarTamanho(totalBytesGrupo)}</span>
            </div>
          </td>
        </tr>
      `;

      html += listaDoGrupo.map(renderizarLinhaTorrent).join('');
    });
  } else {
    html = torrentsVisiveis.map(renderizarLinhaTorrent).join('');
  }

  torrentsTableBody.innerHTML = html;

  // Adiciona listener de clique em cada linha para seleção
  torrentsVisiveis.forEach((t) => {
    const row = torrentsTableBody.querySelector(`.torrent-row[data-hash="${t.hash}"]`);
    row?.addEventListener('click', () => selecionarTorrent(t));
  });
}

// ==========================================
// 4. CARREGAMENTO E SINCRONIZAÇÃO DA API
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
  const torrentsTableBody = document.getElementById('torrentsTableBody');

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

      atualizarIndicadoresOrdenacaoTorrentsUI();
      atualizarIndicadoresFiltroStatusTorrentsUI();
      atualizarPilulasCategoriasUI();
      renderizarTabelaTorrents();

      if (isManual) {
        mostrarToast('Torrents Atualizados', `${torrents.length} torrents sincronizados com sucesso!`, 'success');
      }
    } else {
      state.todosTorrents = [];
      const tableCountText = document.getElementById('tableCountText');
      if (tableCountText) tableCountText.textContent = 'Erro ao listar torrents';
      if (torrentsTableBody) {
        torrentsTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="7">
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
    const tableCountText = document.getElementById('tableCountText');
    if (tableCountText) tableCountText.textContent = 'Erro de comunicação';
    if (torrentsTableBody) {
      torrentsTableBody.innerHTML = `
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
// 5. INICIALIZAÇÃO DE LISTENERS
// ==========================================

export function initTorrentsTable() {
  const btnRecarregarTorrents = document.getElementById('btnRecarregarTorrents');
  const headerRow = document.getElementById('torrentTableHeaderRow');
  const statsGrid = document.getElementById('torrentStatusStatsGrid');
  const inputSearch = document.getElementById('inputSearchTorrents');
  const btnClearSearch = document.getElementById('btnClearTorrentSearch');
  const btnToggleGroup = document.getElementById('btnToggleCategoryGroup');
  const categoryPillsList = document.getElementById('torrentCategoryPillsList');

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

  // Listener de clique nos cards de estatísticas (filtro rápido por status)
  statsGrid?.addEventListener('click', (e) => {
    const statBox = e.target.closest('.stat-box');
    if (!statBox) return;

    const filter = statBox.dataset.filter;
    if (filter) {
      definirFiltroStatusTorrents(filter);
    }
  });

  // Acessibilidade via teclado para os cards de estatísticas
  statsGrid?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const statBox = e.target.closest('.stat-box');
      if (statBox) {
        e.preventDefault();
        const filter = statBox.dataset.filter;
        if (filter) {
          definirFiltroStatusTorrents(filter);
        }
      }
    }
  });

  // Listener de clique nas pílulas de categoria
  categoryPillsList?.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (!pill) return;

    const cat = pill.dataset.category;
    if (cat !== undefined) {
      definirFiltroCategoriaTorrents(cat);
    }
  });

  const btnToggleConsolidated = document.getElementById('btnToggleConsolidatedCategory');

  // Alternar agrupamento em seções por categoria
  btnToggleGroup?.addEventListener('click', alternarAgrupamentoPorCategoria);

  // Alternar modo de consolidação de categorias como 1 torrent
  btnToggleConsolidated?.addEventListener('click', alternarModoConsolidadoCategoria);

  // Pesquisa instantânea por nome, categoria ou hash
  inputSearch?.addEventListener('input', filtrarTorrentsInstantaneamente);
  inputSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inputSearch.value = '';
      filtrarTorrentsInstantaneamente();
    }
  });

  btnClearSearch?.addEventListener('click', () => {
    if (inputSearch) inputSearch.value = '';
    filtrarTorrentsInstantaneamente();
    inputSearch?.focus();
  });

  atualizarIndicadoresOrdenacaoTorrentsUI();
  atualizarIndicadoresFiltroStatusTorrentsUI();
}
