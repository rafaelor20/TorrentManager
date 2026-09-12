/**
 * Torrent Table and Quick Stats Component
 * Features:
 * - Category separation and filtering (dynamic pills and category grouping)
 * - Instant status filtering by clicking top stat cards
 * - Instant torrent search by name, category, and hash
 * - Smart column sorting (name, category, status, progress, size, speeds)
 * - Visual sort indicators (▲ / ▼ / ↕), category, and active filter states
 * - Real-time synchronization and statistics refresh
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { formatarTamanho, formatarVelocidade, mapearStatusLegivel, normalizarTextoBusca, extrairTokensBusca } from '../utils/formatters.js';
import { mostrarToast } from './toast.js';
import { selecionarTorrent, atualizarHeaderTorrentSelecionado, atualizarArquivosSilenciosamente } from './filesManager.js';
import { t, formatTime } from '../utils/i18n.js';

// ==========================================
// 1. TORRENT FILTERING (STATUS, CATEGORY & SEARCH)
// ==========================================

export function obterTorrentsVisiveis() {
  const lista = state.todosTorrents || [];
  if (lista.length === 0) return [];

  const filtroStatus = state.filtroTorrentsStatus || 'all';
  const filtroCat = state.filtroTorrentsCategoria || 'all';
  const termo = (state.termoBuscaTorrents || '').trim();
  const tokensBusca = extrairTokensBusca(termo);

  const filtrados = lista.filter((t) => {
    // 1. Status filter
    if (filtroStatus === 'completed') {
      const isCompleted = t.status === 'uploading' || t.status === 'completed' || (typeof t.progress === 'number' && t.progress >= 1);
      if (!isCompleted) return false;
    } else if (filtroStatus === 'downloading') {
      if (t.status !== 'downloading') return false;
    } else if (filtroStatus === 'paused') {
      if (t.status !== 'paused') return false;
    }

    // 2. Category filter
    if (filtroCat !== 'all') {
      if (filtroCat === '__none__') {
        if (t.category && t.category.trim().length > 0) return false;
      } else {
        if ((t.category || '').trim() !== filtroCat) return false;
      }
    }

    // 3. Text search filter (name, category, and hash)
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
    all: t('filter_label_all'),
    completed: t('filter_label_completed'),
    downloading: t('filter_label_downloading'),
    paused: t('filter_label_paused'),
  };
  mostrarToast(t('toast_status_filter_title'), t('toast_status_filter_msg', { label: labels[state.filtroTorrentsStatus] || state.filtroTorrentsStatus }), 'info');
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

  // If there are no categories assigned to torrents, hide the pills bar
  if (categoriasUnicas.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  const filtroAtual = state.filtroTorrentsCategoria || 'all';

  let pillsHtml = `
    <button type="button" class="category-pill ${filtroAtual === 'all' ? 'is-active' : ''}" data-category="all">
      <span>${t('cat_all')}</span>
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
        <span>${t('cat_uncategorized')}</span>
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
    ? t('label_all_categories')
    : (state.filtroTorrentsCategoria === '__none__' ? t('cat_uncategorized') : state.filtroTorrentsCategoria);

  mostrarToast(t('toast_cat_filter_title'), t('toast_cat_filter_msg', { label }), 'info');
}

export function alternarAgrupamentoPorCategoria() {
  state.agruparPorCategoria = !state.agruparPorCategoria;

  if (state.agruparPorCategoria && state.modoConsolidadoCategoria) {
    state.modoConsolidadoCategoria = false;
    const btnConsolidar = document.getElementById('btnToggleConsolidatedCategory');
    const btnConsolidarText = document.getElementById('btnToggleConsolidatedCategoryText');
    if (btnConsolidar) btnConsolidar.classList.remove('is-active');
    if (btnConsolidarText) btnConsolidarText.textContent = t('btn_consolidate_category');
  }

  const btnToggle = document.getElementById('btnToggleCategoryGroup');
  const btnToggleText = document.getElementById('btnToggleCategoryGroupText');

  if (btnToggle) {
    btnToggle.classList.toggle('is-active', state.agruparPorCategoria);
  }
  if (btnToggleText) {
    btnToggleText.textContent = state.agruparPorCategoria ? t('btn_group_category_active') : t('btn_group_category');
  }

  renderizarTabelaTorrents();

  mostrarToast(
    t('toast_view_title'),
    state.agruparPorCategoria ? t('toast_grouped_msg') : t('toast_linear_msg'),
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
    if (btnGroupText) btnGroupText.textContent = t('btn_group_category');
  }

  const btnConsolidar = document.getElementById('btnToggleConsolidatedCategory');
  const btnConsolidarText = document.getElementById('btnToggleConsolidatedCategoryText');

  if (btnConsolidar) {
    btnConsolidar.classList.toggle('is-active', state.modoConsolidadoCategoria);
  }
  if (btnConsolidarText) {
    btnConsolidarText.textContent = state.modoConsolidadoCategoria ? t('btn_consolidate_category_active') : t('btn_consolidate_category');
  }

  renderizarTabelaTorrents();

  mostrarToast(
    t('toast_consolidated_title'),
    state.modoConsolidadoCategoria
      ? t('toast_consolidated_msg_on')
      : t('toast_consolidated_msg_off'),
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
    const catNome = catKey === '__none__' ? t('cat_uncategorized') : catKey;
    let bytesTotal = 0;
    let downloadSpeedTotal = 0;
    let uploadSpeedTotal = 0;
    let bytesBaixadosTotal = 0;
    let hasDownloading = false;
    let hasPaused = false;
    let allCompleted = true;

    membros.forEach((m) => {
      const size = Number(m.size || 0);
      bytesTotal += size;
      downloadSpeedTotal += Number(m.downloadSpeed || 0);
      uploadSpeedTotal += Number(m.uploadSpeed || 0);

      const prog = typeof m.progress === 'number' ? (m.progress > 1 ? m.progress / 100 : m.progress) : 0;
      bytesBaixadosTotal += size * prog;

      if (m.status === 'downloading') hasDownloading = true;
      if (m.status === 'paused') hasPaused = true;
      if (m.status !== 'completed' && m.status !== 'uploading' && prog < 1) allCompleted = false;
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
// 2. TORRENT SORTING
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
    name: t('sort_col_name'),
    category: t('sort_col_category'),
    status: t('sort_col_status'),
    progress: t('sort_col_progress'),
    size: t('sort_col_size'),
    speeds: t('sort_col_speeds'),
  };
  const dirLabel = state.torrentSortDirection === 'asc' ? t('sort_dir_asc') : t('sort_dir_desc');
  mostrarToast(t('toast_sort_title'), t('toast_sort_msg', { col: labels[colunaId] || colunaId, dir: dirLabel }), 'info');
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
        const catA = String(a.category || t('cat_uncategorized'));
        const catB = String(b.category || t('cat_uncategorized'));
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
// 3. TORRENT TABLE RENDERING
// ==========================================

function renderizarLinhaTorrent(torrent) {
  const statusInfo = mapearStatusLegivel(torrent.status, torrent.rawState);
  const percentualNum = typeof torrent.progress === 'number'
    ? (torrent.progress > 1 ? torrent.progress : torrent.progress * 100)
    : 0;
  const percentualStr = percentualNum.toFixed(1) + '%';
  const isComplete = percentualNum >= 100;

  const tamanhoFormatado = formatarTamanho(torrent.size);
  const dlSpeedStr = torrent.downloadSpeed > 0 ? `↓ ${formatarVelocidade(torrent.downloadSpeed)}` : '';
  const upSpeedStr = torrent.uploadSpeed > 0 ? `↑ ${formatarVelocidade(torrent.uploadSpeed)}` : '';
  const speedDisplay = (dlSpeedStr || upSpeedStr)
    ? `<span class="speed-down">${dlSpeedStr}</span><span class="speed-up">${upSpeedStr}</span>`
    : '<span style="color: var(--text-muted);">—</span>';

  const isSelected = state.torrentSelecionadoAtual && state.torrentSelecionadoAtual.hash === torrent.hash;
  const catNome = torrent.categoryName || (torrent.category ? torrent.category.trim() : '');

  const isVirtual = Boolean(torrent.isCategoryVirtual);
  const hashSub = isVirtual
    ? t('virtual_category_sub', { count: torrent.torrentsList.length })
    : (torrent.hash ? torrent.hash.substring(0, 10) + '...' : '');

  const btnText = isSelected
    ? t('btn_torrent_selected')
    : (isVirtual ? t('btn_view_n_torrents', { count: torrent.torrentsList.length }) : t('btn_select_torrent'));

  return `
    <tr class="torrent-row ${isSelected ? 'selected' : ''} ${isVirtual ? 'is-virtual-category-row' : ''}" data-hash="${torrent.hash}">
      <td class="cell-action">
        <button class="btn btn-outline btn-xs btn-select-torrent" title="${btnText}">
          <span>${btnText}</span>
        </button>
      </td>
      <td class="cell-name">
        <span class="torrent-name-text" title="${torrent.name}">${torrent.name}</span>
        <span class="torrent-hash-sub">${hashSub}</span>
      </td>
      <td class="cell-category">
        ${catNome ? `<span class="category-badge" title="${catNome}">📁 ${catNome}</span>` : `<span class="category-badge category-badge-none">${t('cat_uncategorized')}</span>`}
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
            <span>${isComplete ? t('progress_completed') : ''}</span>
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

  // Update counters and status badges
  if (torrentSearchResultCount) {
    if (temFiltroAtivo) {
      torrentSearchResultCount.textContent = t('showing_filtered_torrents', { count: totalFiltrado, total: totalOriginal });
    } else {
      torrentSearchResultCount.textContent = totalOriginal === 1
        ? t('showing_all_torrents_singular')
        : t('showing_all_torrents', { count: totalOriginal });
    }
  }

  if (tableCountText) {
    if (temFiltroAtivo) {
      tableCountText.textContent = t('table_count_filtered', { count: totalFiltrado, total: totalOriginal });
    } else {
      tableCountText.textContent = totalOriginal === 1
        ? t('table_count_torrents_singular', { client: clientNome })
        : t('table_count_torrents', { count: totalOriginal, client: clientNome });
    }
  }

  if (totalOriginal === 0) {
    torrentsTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">📂</div>
            <h4>${t('empty_torrents_none_title')}</h4>
            <p>${t('empty_torrents_none_desc')}</p>
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
            <h4>${t('empty_torrents_filter_title')}</h4>
            <p>${t('empty_torrents_filter_desc')}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';

  if (state.agruparPorCategoria) {
    // Group visible torrents by category
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
      const catNome = catKey === '__none__' ? t('cat_uncategorized') : catKey;
      let totalBytesGrupo = 0;
      listaDoGrupo.forEach((t) => { totalBytesGrupo += (t.size || 0); });

      html += `
        <tr class="category-group-row">
          <td colspan="7">
            <div class="category-group-header">
              <span class="category-group-icon">📁</span>
              <span class="category-group-name">${catNome}</span>
              <span class="category-group-count">${t('category_group_count', { count: listaDoGrupo.length, plural: listaDoGrupo.length === 1 ? '' : 's' })}</span>
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

  // Add click listener on each row for selection
  torrentsVisiveis.forEach((t) => {
    const row = torrentsTableBody.querySelector(`.torrent-row[data-hash="${t.hash}"]`);
    row?.addEventListener('click', () => selecionarTorrent(t));
  });
}

// ==========================================
// 4. API LOADING AND SYNCHRONIZATION
// ==========================================

let isCarregandoTorrents = false;

export async function carregarTorrents(isManual = false) {
  if (isCarregandoTorrents && !isManual) return;
  isCarregandoTorrents = true;

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
    btnRecarregarText.textContent = t('btn_refreshing');
  }

  try {
    const { ok, data } = await apiService.getTorrents();

    const agora = new Date();
    const horaStr = formatTime(agora);
    if (lastSyncTime) lastSyncTime.textContent = t('last_sync', { time: horaStr });

    if (ok && data.sucesso) {
      state.isConectadoCliente = true;
      const torrents = data.torrents || [];
      state.todosTorrents = torrents;

      // Synchronize data of currently selected torrent and its files
      if (state.torrentSelecionadoAtual) {
        if (state.torrentSelecionadoAtual.isCategoryVirtual) {
          const catKey = state.torrentSelecionadoAtual.category || '__none__';
          const membrosAtualizados = torrents.filter((t) => {
            const tCat = (t.category && t.category.trim()) || '__none__';
            return tCat === catKey;
          });
          if (membrosAtualizados.length > 0) {
            const consolidados = gerarTorrentsConsolidadosPorCategoria(membrosAtualizados);
            if (consolidados.length > 0) {
              state.torrentSelecionadoAtual = {
                ...state.torrentSelecionadoAtual,
                ...consolidados[0],
              };
            }
          }
        } else {
          const atualizado = torrents.find((t) => t.hash === state.torrentSelecionadoAtual.hash);
          if (atualizado) {
            state.torrentSelecionadoAtual = {
              ...state.torrentSelecionadoAtual,
              ...atualizado,
            };
          }
        }

        atualizarHeaderTorrentSelecionado();

        const torrentFilesSection = document.getElementById('torrentFilesSection');
        if (torrentFilesSection && torrentFilesSection.style.display !== 'none') {
          atualizarArquivosSilenciosamente(state.torrentSelecionadoAtual);
        }
      }

      // Update top statistics
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
        mostrarToast(t('toast_torrents_updated_title'), t('toast_torrents_updated_msg', { count: torrents.length }), 'success');
      }
    } else {
      state.todosTorrents = [];
      const tableCountText = document.getElementById('tableCountText');
      if (tableCountText) tableCountText.textContent = t('toast_update_error_title');
      if (torrentsTableBody) {
        torrentsTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="7">
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>${t('empty_torrents_failed_title')}</h4>
                <p>${data.erro || t('empty_torrents_failed_desc', { defaultValue: 'Verifique se o cliente BitTorrent está conectado e tente novamente.' })}</p>
              </div>
            </td>
          </tr>
        `;
      }
      if (isManual) {
        mostrarToast(t('toast_update_error_title'), data.erro || t('toast_update_error_msg'), 'error');
      }
    }
  } catch (err) {
    state.todosTorrents = [];
    const tableCountText = document.getElementById('tableCountText');
    if (tableCountText) tableCountText.textContent = t('toast_network_error_title');
    if (torrentsTableBody) {
      torrentsTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">✕</div>
              <h4>${t('empty_torrents_network_title')}</h4>
              <p>${err.message}</p>
            </div>
          </td>
        </tr>
      `;
    }
    if (isManual) {
      mostrarToast(t('toast_network_error_title'), err.message, 'error');
    }
  } finally {
    isCarregandoTorrents = false;
    if (isManual && btnRecarregarTorrents && refreshIcon && btnRecarregarText) {
      setTimeout(() => {
        btnRecarregarTorrents.disabled = false;
        refreshIcon.classList.remove('spin-animation');
        btnRecarregarText.textContent = t('btn_refresh_torrents');
      }, 300);
    }
  }
}

// ==========================================
// 5. LISTENERS INITIALIZATION
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

  // Click listener on table headers for sorting
  headerRow?.addEventListener('click', (e) => {
    const th = e.target.closest('th.sortable-th');
    if (!th) return;

    const colId = th.dataset.col;
    if (colId) {
      alterarOrdenacaoTorrents(colId);
    }
  });

  // Click listener on stat cards (quick status filter)
  statsGrid?.addEventListener('click', (e) => {
    const statBox = e.target.closest('.stat-box');
    if (!statBox) return;

    const filter = statBox.dataset.filter;
    if (filter) {
      definirFiltroStatusTorrents(filter);
    }
  });

  // Keyboard accessibility for stat cards
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

  // Click listener on category pills
  categoryPillsList?.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (!pill) return;

    const cat = pill.dataset.category;
    if (cat !== undefined) {
      definirFiltroCategoriaTorrents(cat);
    }
  });

  const btnToggleConsolidated = document.getElementById('btnToggleConsolidatedCategory');

  // Toggle category grouping sections
  btnToggleGroup?.addEventListener('click', alternarAgrupamentoPorCategoria);

  // Toggle category consolidation mode as 1 torrent
  btnToggleConsolidated?.addEventListener('click', alternarModoConsolidadoCategoria);

  // Instant search by name, category, or hash
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

window.addEventListener('languageChanged', () => {
  atualizarPilulasCategoriasUI();
  renderizarTabelaTorrents();
});
