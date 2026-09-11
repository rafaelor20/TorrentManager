/**
 * Componente do Gerenciador de Arquivos do Torrent
 * Recursos:
 * - Virtualização de Alto Desempenho (Windowing DOM a 60 FPS para 100.000+ arquivos)
 * - Ordenação Inteligente por Coluna (Nome, Caminho, Tamanho, Prioridade, Progresso, #)
 * - Resize Dinâmico de Largura das Colunas com persistência local
 * - Reordenação de Posição de Colunas via Arrastar e Soltar (Drag & Drop)
 * - Menu de Contexto (Botão Direito) para Exibir / Ocultar Colunas
 * - Pesquisa Instantânea Pré-indexada e Seleção em Massa
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { formatarTamanho, formatarPrioridade, mapearStatusLegivel } from '../utils/formatters.js';
import { mostrarToast } from './toast.js';
import { setFeedback } from './diagnostics.js';
import { t, formatNumber } from '../utils/i18n.js';

const ROW_HEIGHT = 44; // Altura fixa de cada linha em pixels
const BUFFER_COUNT = 15; // Buffer de linhas renderizadas no viewport

const LOCAL_STORAGE_WIDTHS_KEY = 'torrentmanager_files_col_widths';
const LOCAL_STORAGE_ORDER_KEY = 'torrentmanager_files_col_order';
const LOCAL_STORAGE_HIDDEN_KEY = 'torrentmanager_files_hidden_cols';

export const COLUNAS_CONFIG = {
  check: { defaultWidth: 54, minWidth: 44, labelKey: 'ctx_col_check', tagKey: 'ctx_tag_checkbox' },
  index: { defaultWidth: 60, minWidth: 45, labelKey: 'ctx_col_index', tagKey: 'ctx_tag_index' },
  name: { defaultWidth: 320, minWidth: 140, labelKey: 'ctx_col_name', tagKey: 'ctx_tag_text' },
  path: { defaultWidth: 360, minWidth: 140, labelKey: 'ctx_col_path', tagKey: 'ctx_tag_text' },
  size: { defaultWidth: 120, minWidth: 80, labelKey: 'ctx_col_size', tagKey: 'ctx_tag_bytes' },
  priority: { defaultWidth: 150, minWidth: 110, labelKey: 'ctx_col_priority', tagKey: 'ctx_tag_status' },
  progress: { defaultWidth: 140, minWidth: 100, labelKey: 'ctx_col_progress', tagKey: 'ctx_tag_bar' },
};

export const COLUNAS_INFO = new Proxy(COLUNAS_CONFIG, {
  get(target, prop) {
    if (prop in target) {
      const cfg = target[prop];
      return {
        ...cfg,
        get label() { return t(cfg.labelKey); },
        get tag() { return t(cfg.tagKey); },
      };
    }
    return undefined;
  },
});

let scrollRafId = null;

// Extrai estritamente apenas o nome do arquivo (ex: "video.mp4" de "Pasta/Sub/video.mp4")
export function extrairApenasNomeArquivo(rawName, rawPath) {
  const str = String(rawName || rawPath || '').replace(/\\/g, '/');
  const partes = str.split('/');
  return partes[partes.length - 1] || str;
}

// Extrai a estrutura de diretórios/pastas (ex: "Pasta/Sub" de "Pasta/Sub/video.mp4")
export function extrairApenasCaminho(rawPath, rawName) {
  const str = String(rawPath || rawName || '').replace(/\\/g, '/');
  const partes = str.split('/');
  if (partes.length > 1) {
    partes.pop();
    return partes.join('/');
  }
  if (rawPath && rawPath !== rawName && rawPath !== './') {
    return rawPath;
  }
  return './';
}

// Normaliza texto para busca (remove acentos e converte para minúsculas)
export function normalizarTextoBusca(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Extrai tokens de busca suportando termos compostos por espaço ou aspas (ex: "gran turismo" usa ou gran turismo usa)
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

// ==========================================
// 1. GERENCIAMENTO DE ESTADO E RESUMO
// ==========================================

export function obterColunasVisiveis() {
  return state.columnOrder.filter((colId) => !state.hiddenColumns.has(colId));
}

export function atualizarContadoresFiltros() {
  const badgeCountAll = document.getElementById('badgeCountAll');
  const badgeCountActive = document.getElementById('badgeCountActive');
  const badgeCountInactive = document.getElementById('badgeCountInactive');
  const badgeCountSelected = document.getElementById('badgeCountSelected');

  const total = state.todosArquivosDoTorrent.length;
  let countActive = 0;
  let countInactive = 0;

  state.todosArquivosDoTorrent.forEach((f) => {
    if (f.priority !== 0) {
      countActive++;
    } else {
      countInactive++;
    }
  });

  const countSelected = state.arquivosSelecionadosIndices.size;

  if (badgeCountAll) badgeCountAll.textContent = formatNumber(total);
  if (badgeCountActive) badgeCountActive.textContent = formatNumber(countActive);
  if (badgeCountInactive) badgeCountInactive.textContent = formatNumber(countInactive);
  if (badgeCountSelected) badgeCountSelected.textContent = formatNumber(countSelected);
}

export function atualizarResumoSelecao() {
  const filesSelectionBadge = document.getElementById('filesSelectionBadge');
  const selectionSummaryCount = document.getElementById('selectionSummaryCount');
  const selectionSummarySize = document.getElementById('selectionSummarySize');

  const totalArquivos = state.todosArquivosDoTorrent.length;
  const totalSelecionados = state.arquivosSelecionadosIndices.size;

  let bytesSelecionados = 0;
  state.todosArquivosDoTorrent.forEach((f) => {
    const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
    if (state.arquivosSelecionadosIndices.has(fileIndex)) {
      bytesSelecionados += f.size || 0;
    }
  });

  if (filesSelectionBadge) {
    filesSelectionBadge.textContent = t('badge_files_selected', { count: formatNumber(totalSelecionados) });
  }
  if (selectionSummaryCount) {
    selectionSummaryCount.textContent = t('selection_summary', {
      selected: formatNumber(totalSelecionados),
      total: formatNumber(totalArquivos)
    });
  }
  if (selectionSummarySize) {
    selectionSummarySize.textContent = `(${formatarTamanho(bytesSelecionados)})`;
  }

  atualizarContadoresFiltros();
}

export function alternarSelecaoArquivo(index, forcarEstado = null) {
  const isMarcado = forcarEstado !== null
    ? forcarEstado
    : !state.arquivosSelecionadosIndices.has(index);

  if (isMarcado) {
    state.arquivosSelecionadosIndices.add(index);
  } else {
    state.arquivosSelecionadosIndices.delete(index);
  }

  const tr = document.querySelector(`.torrent-file-row[data-index="${index}"]`);
  if (tr) {
    tr.classList.toggle('checked', isMarcado);
    const checkbox = tr.querySelector('.file-check-input');
    if (checkbox) checkbox.checked = isMarcado;
  }

  atualizarResumoSelecao();
}

// ==========================================
// 2. ORDENAÇÃO DE ARQUIVOS (SORTING)
// ==========================================

export function alterarOrdenacao(colunaId) {
  if (state.sortColumn === colunaId) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortColumn = colunaId;
    state.sortDirection = (colunaId === 'size' || colunaId === 'progress') ? 'desc' : 'asc';
  }

  atualizarIndicadoresOrdenacaoUI();
  filtrarArquivosInstantaneamente();
}

function atualizarIndicadoresOrdenacaoUI() {
  document.querySelectorAll('#filesTableHeaderRow th').forEach((th) => {
    const colId = th.dataset.col;
    const arrow = th.querySelector('.sort-arrow');
    const isCurrent = state.sortColumn === colId;

    th.classList.remove('sorted-asc', 'sorted-desc');
    if (arrow) {
      if (isCurrent) {
        th.classList.add(state.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        arrow.textContent = state.sortDirection === 'asc' ? '▲' : '▼';
      } else {
        arrow.textContent = '↕';
      }
    }
  });
}

function ordenarListaDeArquivos(lista) {
  if (!lista || lista.length <= 1) return lista;

  const col = state.sortColumn;
  const isAsc = state.sortDirection === 'asc';
  const mult = isAsc ? 1 : -1;

  return [...lista].sort((a, b) => {
    switch (col) {
      case 'name': {
        const nomeA = a._fileName || extrairApenasNomeArquivo(a.name, a.path);
        const nomeB = b._fileName || extrairApenasNomeArquivo(b.name, b.path);
        return nomeA.localeCompare(nomeB, undefined, { numeric: true, sensitivity: 'base' }) * mult;
      }
      case 'path': {
        const pathA = a._dirPath || extrairApenasCaminho(a.path, a.name);
        const pathB = b._dirPath || extrairApenasCaminho(b.path, b.name);
        return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' }) * mult;
      }
      case 'size': {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        return (sizeA - sizeB) * mult;
      }
      case 'priority': {
        const prioA = Number(a.priority ?? 1);
        const prioB = Number(b.priority ?? 1);
        return (prioA - prioB) * mult;
      }
      case 'progress': {
        const progA = Number(a.progress || 0);
        const progB = Number(b.progress || 0);
        return (progA - progB) * mult;
      }
      case 'check': {
        const indexA = a._fileIndex !== undefined ? a._fileIndex : a.index;
        const indexB = b._fileIndex !== undefined ? b._fileIndex : b.index;
        const checkA = state.arquivosSelecionadosIndices.has(indexA) ? 1 : 0;
        const checkB = state.arquivosSelecionadosIndices.has(indexB) ? 1 : 0;
        return (checkA - checkB) * mult;
      }
      case 'index':
      default: {
        const idxA = a._fileIndex !== undefined ? a._fileIndex : (a.index || 0);
        const idxB = b._fileIndex !== undefined ? b._fileIndex : (b.index || 0);
        return (idxA - idxB) * mult;
      }
    }
  });
}

// ==========================================
// 3. FILTRAGEM & PESQUISA INSTANTÂNEA
// ==========================================

export function obterArquivosVisiveis() {
  if (!state.todosArquivosDoTorrent || state.todosArquivosDoTorrent.length === 0) {
    return [];
  }

  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const filterStatusActive = document.getElementById('filterStatusActive');
  const filterStatusInactive = document.getElementById('filterStatusInactive');
  const filterOnlySelected = document.getElementById('filterOnlySelected');

  const termo = (inputSearchFiles?.value || '').trim();
  const tokensBusca = extrairTokensBusca(termo);
  const statusFiltro = filterStatusActive?.checked
    ? 'active'
    : filterStatusInactive?.checked
      ? 'inactive'
      : 'all';
  state.filtroStatusArquivo = statusFiltro;

  const apenasSelecionados = Boolean(filterOnlySelected?.checked);

  const filtrados = state.todosArquivosDoTorrent.filter((f) => {
    const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;

    // 1. Filtro de Status: Ativos (prio > 0) / Inativos (prio === 0) / Todos
    if (statusFiltro === 'active' && f.priority === 0) {
      return false;
    }
    if (statusFiltro === 'inactive' && f.priority !== 0) {
      return false;
    }

    // 2. Filtro: Apenas selecionados / marcados
    if (apenasSelecionados && !state.arquivosSelecionadosIndices.has(fileIndex)) {
      return false;
    }

    // 3. Filtro: Pesquisa instantânea por múltiplas substrings (todas as palavras devem coincidir)
    if (tokensBusca.length > 0) {
      const searchStr = f._searchNormalized || normalizarTextoBusca(`${f._fileName} ${f._dirPath} ${f.name || ''} ${f.path || ''}`);
      for (let i = 0; i < tokensBusca.length; i++) {
        if (!searchStr.includes(tokensBusca[i])) {
          return false;
        }
      }
    }

    return true;
  });

  return ordenarListaDeArquivos(filtrados);
}

export function filtrarArquivosInstantaneamente() {
  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const filesScrollArea = document.getElementById('filesScrollArea');

  const termo = (inputSearchFiles?.value || '').trim();
  state.termoBuscaAtual = termo;

  if (btnClearSearch) {
    btnClearSearch.style.display = termo.length > 0 ? 'flex' : 'none';
  }

  if (!state.todosArquivosDoTorrent || state.todosArquivosDoTorrent.length === 0) {
    return;
  }

  state.arquivosFiltradosAtuais = obterArquivosVisiveis();

  if (filesScrollArea) {
    filesScrollArea.scrollTop = 0;
  }

  renderizarTabelaArquivosVirtualizada();
}

// ==========================================
// 4. RENDERIZAÇÃO VIRTUALIZADA (WINDOWING DOM)
// ==========================================

function gerarCelula(colunaId, f, fileIndex, isSelected) {
  switch (colunaId) {
    case 'check':
      return `
        <td class="cell-file-check">
          <label class="file-check-label" title="${t('checkbox_file_title')}">
            <input type="checkbox" class="file-check-input" data-index="${fileIndex}" ${isSelected ? 'checked' : ''}>
            <span class="file-custom-check"></span>
          </label>
        </td>
      `;
    case 'index':
      return `<td class="cell-file-index">${fileIndex}</td>`;
    case 'name': {
      const nomeArquivo = f._fileName || extrairApenasNomeArquivo(f.name, f.path);
      const isDownloaded = typeof f.progress === 'number' && f.progress >= 0.9999;
      return `
        <td class="cell-file-name" data-index="${fileIndex}">
          <div class="file-name-cell-wrapper">
            <span class="file-name-text ${isDownloaded ? 'is-downloaded' : 'not-downloaded'}" data-action="open-folder" data-index="${fileIndex}" title="${isDownloaded ? t('file_downloaded_title') : t('file_progress_title', { prog: ((f.progress || 0) * 100).toFixed(1) })}">
              ${nomeArquivo}
            </span>
            ${isDownloaded ? `
              <button type="button" class="btn-file-open-folder" data-action="open-folder" data-index="${fileIndex}" title="${t('btn_open_folder_title')}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </td>
      `;
    }
    case 'path': {
      const caminhoArquivo = f._dirPath || extrairApenasCaminho(f.path, f.name);
      return `
        <td class="cell-file-path">
          <span class="file-path-text" title="${caminhoArquivo}">${caminhoArquivo}</span>
        </td>
      `;
    }
    case 'size':
      return `<td class="cell-file-size">${formatarTamanho(f.size)}</td>`;
    case 'priority': {
      const prioInfo = formatarPrioridade(f.priority);
      return `
        <td class="cell-file-prio">
          <span class="prio-tag ${prioInfo.classe}">${prioInfo.label}</span>
        </td>
      `;
    }
    case 'progress': {
      const percentualNum = typeof f.progress === 'number'
        ? (f.progress > 1 ? f.progress : f.progress * 100)
        : 0;
      const percentualStr = percentualNum.toFixed(1) + '%';
      const isComplete = percentualNum >= 100;
      return `
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
    }
    default:
      return `<td></td>`;
  }
}

export function renderizarTabelaArquivosVirtualizada() {
  const searchResultCount = document.getElementById('searchResultCount');
  const filesCountText = document.getElementById('filesCountText');
  const filesTableBody = document.getElementById('filesTableBody');
  const filesScrollArea = document.getElementById('filesScrollArea');

  if (!filesTableBody) return;

  const totalOriginal = state.todosArquivosDoTorrent.length;
  const totalFiltrado = state.arquivosFiltradosAtuais.length;
  const colunasVisiveis = obterColunasVisiveis();
  const colCount = Math.max(1, colunasVisiveis.length);

  if (state.termoBuscaAtual !== '') {
    if (searchResultCount) searchResultCount.textContent = t('files_badge_ratio', { count: formatNumber(totalFiltrado), total: formatNumber(totalOriginal) });
    if (filesCountText) filesCountText.textContent = t('files_count_query', { count: formatNumber(totalFiltrado), query: state.termoBuscaAtual });
  } else if (totalFiltrado !== totalOriginal) {
    if (searchResultCount) searchResultCount.textContent = t('files_badge_ratio_filtered', { count: formatNumber(totalFiltrado), total: formatNumber(totalOriginal) });
    if (filesCountText) filesCountText.textContent = t('files_count_filtered', { count: formatNumber(totalFiltrado), total: formatNumber(totalOriginal) });
  } else {
    if (searchResultCount) searchResultCount.textContent = t('files_badge_available', { count: formatNumber(totalOriginal) });
    if (filesCountText) filesCountText.textContent = t('files_count_loaded', { count: formatNumber(totalOriginal) });
  }

  if (totalFiltrado === 0) {
    filesTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="${colCount}">
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h4>${t('empty_files_none_title')}</h4>
            <p>${t('empty_files_none_desc')}</p>
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
    spacerTop.innerHTML = `<td colspan="${colCount}" style="height: ${topPadding}px; padding: 0; margin: 0; border: none;"></td>`;
    fragment.appendChild(spacerTop);
  }

  // Renderiza itens visíveis de acordo com as colunas ativas e ordenadas
  for (let i = startIndex; i < endIndex; i++) {
    const f = state.arquivosFiltradosAtuais[i];
    const fileIndex = f._fileIndex !== undefined ? f._fileIndex : (f.index !== undefined ? f.index : i);
    const isSelected = state.arquivosSelecionadosIndices.has(fileIndex);

    const tr = document.createElement('tr');
    tr.className = `torrent-file-row ${isSelected ? 'checked' : ''}`;
    tr.dataset.index = fileIndex;

    const rowCellsHtml = colunasVisiveis.map((colId) => gerarCelula(colId, f, fileIndex, isSelected)).join('');
    tr.innerHTML = rowCellsHtml;

    fragment.appendChild(tr);
  }

  // Espaçador virtual inferior
  if (bottomPadding > 0) {
    const spacerBottom = document.createElement('tr');
    spacerBottom.className = 'virtual-spacer-row';
    spacerBottom.style.height = `${bottomPadding}px`;
    spacerBottom.innerHTML = `<td colspan="${colCount}" style="height: ${bottomPadding}px; padding: 0; margin: 0; border: none;"></td>`;
    fragment.appendChild(spacerBottom);
  }

  filesTableBody.innerHTML = '';
  filesTableBody.appendChild(fragment);
  atualizarResumoSelecao();
}

// ==========================================
// 5. RESIZE DE COLUNAS (LARGURA ARRASTÁVEL)
// ==========================================

function carregarLargurasColunas() {
  try {
    const salvas = localStorage.getItem(LOCAL_STORAGE_WIDTHS_KEY);
    if (salvas) {
      state.columnWidths = JSON.parse(salvas);
    }
  } catch {}
}

function salvarLargurasColunas() {
  try {
    localStorage.setItem(LOCAL_STORAGE_WIDTHS_KEY, JSON.stringify(state.columnWidths));
  } catch {}
}

function aplicarLargurasColunas() {
  document.querySelectorAll('#filesTableHeaderRow th').forEach((th) => {
    const colId = th.dataset.col;
    if (state.columnWidths && state.columnWidths[colId]) {
      th.style.width = `${state.columnWidths[colId]}px`;
    }
  });
}

function initColumnResizers() {
  carregarLargurasColunas();
  aplicarLargurasColunas();

  const headerRow = document.getElementById('filesTableHeaderRow');
  if (!headerRow) return;

  headerRow.addEventListener('mousedown', (e) => {
    const resizer = e.target.closest('.col-resizer');
    if (!resizer) return;

    e.preventDefault();
    e.stopPropagation();

    const th = resizer.closest('th');
    if (!th) return;

    const colId = th.dataset.col;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;
    const minWidth = COLUNAS_INFO[colId]?.minWidth || 60;

    resizer.classList.add('is-active');
    document.body.classList.add('is-col-resizing');

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, startWidth + deltaX);
      th.style.width = `${newWidth}px`;
      state.columnWidths[colId] = newWidth;
    };

    const onMouseUp = () => {
      resizer.classList.remove('is-active');
      document.body.classList.remove('is-col-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      salvarLargurasColunas();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Double click no resizer restaura tamanho padrão da coluna
  headerRow.addEventListener('dblclick', (e) => {
    const resizer = e.target.closest('.col-resizer');
    if (!resizer) return;

    const th = resizer.closest('th');
    if (!th) return;

    const colId = th.dataset.col;
    const defaultWidth = COLUNAS_INFO[colId]?.defaultWidth || 150;

    th.style.width = `${defaultWidth}px`;
    state.columnWidths[colId] = defaultWidth;
    salvarLargurasColunas();
    mostrarToast(t('toast_col_adjusted_title'), t('toast_col_adjusted_msg', { col: COLUNAS_INFO[colId]?.label || colId }), 'info');
  });
}

// ==========================================
// 6. REORDENAÇÃO DE POSIÇÃO DAS COLUNAS (DRAG & DROP)
// ==========================================

function carregarOrdemColunas() {
  try {
    const salva = localStorage.getItem(LOCAL_STORAGE_ORDER_KEY);
    if (salva) {
      const ordem = JSON.parse(salva);
      if (Array.isArray(ordem) && ordem.length === 7) {
        state.columnOrder = ordem;
      }
    }
  } catch {}
}

function salvarOrdemColunas() {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(state.columnOrder));
  } catch {}
}

function renderizarOrdemColunasHeader() {
  const headerRow = document.getElementById('filesTableHeaderRow');
  if (!headerRow) return;

  const thMap = {};
  headerRow.querySelectorAll('th').forEach((th) => {
    thMap[th.dataset.col] = th;
  });

  state.columnOrder.forEach((colId) => {
    const th = thMap[colId];
    if (th) {
      headerRow.appendChild(th);
      th.style.display = state.hiddenColumns.has(colId) ? 'none' : '';
    }
  });

  aplicarLargurasColunas();
  atualizarIndicadoresOrdenacaoUI();
}

function initColumnReordering() {
  carregarOrdemColunas();
  renderizarOrdemColunasHeader();

  const headerRow = document.getElementById('filesTableHeaderRow');
  if (!headerRow) return;

  let draggedColId = null;

  headerRow.addEventListener('dragstart', (e) => {
    const th = e.target.closest('th.draggable-col');
    if (!th || e.target.closest('.col-resizer')) {
      e.preventDefault();
      return;
    }

    draggedColId = th.dataset.col;
    th.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedColId);
  });

  headerRow.addEventListener('dragover', (e) => {
    const targetTh = e.target.closest('th');
    if (!targetTh || !draggedColId) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetRect = targetTh.getBoundingClientRect();
    const isRightHalf = e.clientX > targetRect.left + targetRect.width / 2;

    headerRow.querySelectorAll('th').forEach((th) => {
      th.classList.remove('drag-over-left', 'drag-over-right');
    });

    if (isRightHalf) {
      targetTh.classList.add('drag-over-right');
    } else {
      targetTh.classList.add('drag-over-left');
    }
  });

  headerRow.addEventListener('dragleave', (e) => {
    const targetTh = e.target.closest('th');
    if (targetTh && !targetTh.contains(e.relatedTarget)) {
      targetTh.classList.remove('drag-over-left', 'drag-over-right');
    }
  });

  headerRow.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetTh = e.target.closest('th');
    if (!targetTh || !draggedColId) return;

    const targetColId = targetTh.dataset.col;
    if (draggedColId === targetColId) return;

    const targetRect = targetTh.getBoundingClientRect();
    const insertAfter = e.clientX > targetRect.left + targetRect.width / 2;

    const oldIndex = state.columnOrder.indexOf(draggedColId);
    let targetIndex = state.columnOrder.indexOf(targetColId);

    if (oldIndex !== -1 && targetIndex !== -1) {
      state.columnOrder.splice(oldIndex, 1);
      if (insertAfter) {
        targetIndex = state.columnOrder.indexOf(targetColId) + 1;
      } else {
        targetIndex = state.columnOrder.indexOf(targetColId);
      }
      state.columnOrder.splice(targetIndex, 0, draggedColId);

      salvarOrdemColunas();
      renderizarOrdemColunasHeader();
      renderizarTabelaArquivosVirtualizada();
      mostrarToast(t('toast_order_title'), t('toast_order_msg'), 'info');
    }
  });

  headerRow.addEventListener('dragend', () => {
    draggedColId = null;
    headerRow.querySelectorAll('th').forEach((th) => {
      th.classList.remove('is-dragging', 'drag-over-left', 'drag-over-right');
    });
  });
}

// ==========================================
// 7. MENU DE CONTEXTO (EXIBIR / OCULTAR COLUNAS)
// ==========================================

function carregarColunasOcultas() {
  try {
    const salvas = localStorage.getItem(LOCAL_STORAGE_HIDDEN_KEY);
    if (salvas) {
      const arr = JSON.parse(salvas);
      if (Array.isArray(arr)) {
        state.hiddenColumns = new Set(arr);
      }
    }
  } catch {}
}

function salvarColunasOcultas() {
  try {
    localStorage.setItem(LOCAL_STORAGE_HIDDEN_KEY, JSON.stringify(Array.from(state.hiddenColumns)));
  } catch {}
}

export function alternarVisibilidadeColuna(colId) {
  const isOculta = state.hiddenColumns.has(colId);

  if (isOculta) {
    state.hiddenColumns.delete(colId);
  } else {
    // Garante que pelo menos 1 coluna permaneça sempre visível
    const visiveis = obterColunasVisiveis();
    if (visiveis.length <= 1) {
      mostrarToast(t('toast_warn_title'), t('toast_warn_min_col'), 'error');
      return;
    }
    state.hiddenColumns.add(colId);
  }

  salvarColunasOcultas();
  renderizarOrdemColunasHeader();
  renderizarItensMenuContexto();
  renderizarTabelaArquivosVirtualizada();

  const info = COLUNAS_INFO[colId];
  const acaoStr = isOculta ? t('col_action_shown') : t('col_action_hidden');
  mostrarToast(t('toast_col_updated_title'), t('toast_col_updated_msg', { col: info?.label || colId, action: acaoStr }), 'info');
}

export function exibirTodasColunas() {
  state.hiddenColumns.clear();
  salvarColunasOcultas();
  renderizarOrdemColunasHeader();
  renderizarItensMenuContexto();
  renderizarTabelaArquivosVirtualizada();
  mostrarToast(t('toast_cols_restored_title'), t('toast_cols_restored_msg'), 'success');
}

export function restaurarPadraoColunas() {
  state.columnOrder = ['check', 'index', 'name', 'path', 'size', 'priority', 'progress'];
  state.columnWidths = {};
  state.hiddenColumns.clear();

  try {
    localStorage.removeItem(LOCAL_STORAGE_ORDER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_WIDTHS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_HIDDEN_KEY);
  } catch {}

  renderizarOrdemColunasHeader();
  aplicarLargurasColunas();
  renderizarItensMenuContexto();
  renderizarTabelaArquivosVirtualizada();
  mostrarToast(t('toast_pattern_restored_title'), t('toast_pattern_restored_msg'), 'info');
}

function renderizarItensMenuContexto() {
  const container = document.getElementById('filesContextMenuItems');
  if (!container) return;

  const visiveisCount = obterColunasVisiveis().length;

  container.innerHTML = state.columnOrder.map((colId) => {
    const info = COLUNAS_INFO[colId] || { label: colId, tag: '' };
    const isVisible = !state.hiddenColumns.has(colId);
    const isLastVisible = isVisible && visiveisCount === 1;

    return `
      <div class="context-menu-item ${isVisible ? 'is-visible' : ''} ${isLastVisible ? 'is-disabled' : ''}" data-col="${colId}" title="${isLastVisible ? t('ctx_cannot_hide_last') : t('ctx_toggle_hint')}">
        <div class="context-menu-item-left">
          <span class="ctx-check-box">${isVisible ? '✓' : ''}</span>
          <span>${info.label}</span>
        </div>
        <span class="context-menu-item-tag">${info.tag}</span>
      </div>
    `;
  }).join('');

  // Listeners para os itens do menu
  container.querySelectorAll('.context-menu-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const colId = item.dataset.col;
      if (colId) {
        alternarVisibilidadeColuna(colId);
      }
    });
  });
}

function initFilesContextMenu() {
  carregarColunasOcultas();

  const filesCard = document.querySelector('.files-card') || document.getElementById('filesTable');
  const filesTable = document.getElementById('filesTable');
  const contextMenu = document.getElementById('filesContextMenu');
  const btnShowAll = document.getElementById('btnCtxShowAllCols');
  const btnReset = document.getElementById('btnCtxResetCols');

  if (!contextMenu || !filesTable) return;

  // Abre menu no botão direito (contextmenu)
  const openContextMenu = (e) => {
    e.preventDefault();

    renderizarItensMenuContexto();

    const menuWidth = 260;
    const menuHeight = 340;
    let posX = e.clientX;
    let posY = e.clientY;

    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 12;
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 12;
    }

    contextMenu.style.left = `${Math.max(10, posX)}px`;
    contextMenu.style.top = `${Math.max(10, posY)}px`;
    contextMenu.style.display = 'block';
  };

  filesTable.addEventListener('contextmenu', openContextMenu);
  const scrollArea = document.getElementById('filesScrollArea');
  if (scrollArea) scrollArea.addEventListener('contextmenu', openContextMenu);
  const metaBar = document.querySelector('.table-meta-bar');
  if (metaBar) metaBar.addEventListener('contextmenu', openContextMenu);

  // Fecha menu ao clicar fora
  document.addEventListener('click', (e) => {
    if (contextMenu.style.display !== 'none' && !contextMenu.contains(e.target)) {
      contextMenu.style.display = 'none';
    }
  });

  // Fecha menu com a tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contextMenu.style.display !== 'none') {
      contextMenu.style.display = 'none';
    }
  });

  // Ações do rodapé do menu de contexto
  btnShowAll?.addEventListener('click', (e) => {
    e.stopPropagation();
    exibirTodasColunas();
  });

  btnReset?.addEventListener('click', (e) => {
    e.stopPropagation();
    restaurarPadraoColunas();
  });
}

// ==========================================
// 8. SELEÇÃO E APLICAÇÃO DE PRIORIDADES
// ==========================================

export function atualizarHeaderTorrentSelecionado() {
  const torrent = state.torrentSelecionadoAtual;
  if (!torrent) return;

  const selectedTorrentName = document.getElementById('selectedTorrentName');
  const selectedTorrentMeta = document.getElementById('selectedTorrentMeta');
  const selectedTorrentStatus = document.getElementById('selectedTorrentStatus');
  const filesHashTag = document.getElementById('filesHashTag');

  if (selectedTorrentName) selectedTorrentName.textContent = torrent.name;

  const statusInfo = mapearStatusLegivel(torrent.status, torrent.rawState);
  if (selectedTorrentStatus) {
    selectedTorrentStatus.textContent = statusInfo.label;
    selectedTorrentStatus.className = `selected-torrent-status status-tag ${statusInfo.classe}`;
  }

  if (filesHashTag) {
    filesHashTag.textContent = torrent.isCategoryVirtual
      ? t('files_virtual_hash', { count: torrent.torrentsList?.length || 0 })
      : `Hash: ${torrent.hash}`;
  }

  if (selectedTorrentMeta) {
    const totalArquivos = state.todosArquivosDoTorrent.length;
    if (torrent.isCategoryVirtual) {
      selectedTorrentMeta.textContent = t('files_meta_virtual', {
        count: formatNumber(totalArquivos),
        torrents: torrent.torrentsList?.length || 0,
        size: formatarTamanho(torrent.size),
      });
    } else {
      selectedTorrentMeta.textContent = t('files_meta_normal', {
        count: formatNumber(totalArquivos),
        size: formatarTamanho(torrent.size),
      });
    }
  }
}

export async function executarComConcorrencia(itens, limite = 5, fn = async () => {}) {
  if (!Array.isArray(itens) || itens.length === 0) return [];
  const resultados = [];
  const emExecucao = [];

  for (const item of itens) {
    const p = Promise.resolve().then(() => fn(item));
    resultados.push(p);

    if (limite <= itens.length) {
      const e = p.then(() => emExecucao.splice(emExecucao.indexOf(e), 1)).catch(() => emExecucao.splice(emExecucao.indexOf(e), 1));
      emExecucao.push(e);
      if (emExecucao.length >= limite) {
        await Promise.race(emExecucao);
      }
    }
  }

  return Promise.all(resultados);
}

let isAtualizandoSilenciosamente = false;

export async function atualizarArquivosSilenciosamente(torrent) {
  if (!torrent || !torrent.hash) return;
  if (isAtualizandoSilenciosamente) return;
  if (!state.todosArquivosDoTorrent || state.todosArquivosDoTorrent.length === 0) return;
  const torrentFilesSection = document.getElementById('torrentFilesSection');
  if (!torrentFilesSection || torrentFilesSection.style.display === 'none') return;

  isAtualizandoSilenciosamente = true;
  try {
    if (torrent.isCategoryVirtual && Array.isArray(torrent.torrentsList)) {
      const hashes = torrent.torrentsList.map((t) => t.hash);
      const { ok, data } = await apiService.getBatchTorrentFiles(hashes);
      const filesByHash = (ok && data?.sucesso && data?.filesByHash) ? data.filesByHash : {};

      const resultados = await executarComConcorrencia(torrent.torrentsList, 5, async (t) => {
        let files = filesByHash[t.hash];
        if (!files) {
          const resInd = await apiService.getTorrentFiles(t.hash);
          files = resInd.ok && resInd.data?.sucesso && Array.isArray(resInd.data.files) ? resInd.data.files : [];
        }
        return {
          torrent: t,
          files: Array.isArray(files) ? files : [],
        };
      });

      const novosPorOrigem = new Map();
      resultados.forEach(({ torrent: t, files }) => {
        files.forEach((f, idx) => {
          const origIdx = typeof f.index === 'number' ? f.index : idx;
          novosPorOrigem.set(`${t.hash}_${origIdx}`, f);
        });
      });

      if (state.todosArquivosDoTorrent.length > 0) {
        state.todosArquivosDoTorrent.forEach((item) => {
          const key = `${item._originTorrentHash}_${item._originFileIndex}`;
          const novo = novosPorOrigem.get(key);
          if (novo) {
            item.progress = typeof novo.progress === 'number' ? novo.progress : item.progress;
            item.size = novo.size || item.size;
            item.isAvailable = Boolean(novo.is_seed || novo.availability > 0 || item.isAvailable);

            if (typeof novo.priority === 'number') {
              item.priority = novo.priority;
              const globalIdx = item._fileIndex !== undefined ? item._fileIndex : item.index;
              if (item.priority !== 0) {
                state.arquivosSelecionadosIndices.add(globalIdx);
              } else {
                state.arquivosSelecionadosIndices.delete(globalIdx);
              }
            }
          }
        });
      }
    } else {
      const { ok, data } = await apiService.getTorrentFiles(torrent.hash);
      if (ok && data?.sucesso && Array.isArray(data.files)) {
        const novosPorIdx = new Map();
        data.files.forEach((f, idx) => {
          const fileIndex = typeof f.index === 'number' ? f.index : idx;
          novosPorIdx.set(fileIndex, f);
        });

        if (state.todosArquivosDoTorrent.length > 0) {
          state.todosArquivosDoTorrent.forEach((item) => {
            const fileIndex = item._fileIndex !== undefined ? item._fileIndex : item.index;
            const novo = novosPorIdx.get(fileIndex);
            if (novo) {
              item.progress = typeof novo.progress === 'number' ? novo.progress : item.progress;
              item.size = novo.size || item.size;
              item.isAvailable = Boolean(novo.is_seed || novo.availability > 0 || item.isAvailable);

              if (typeof novo.priority === 'number') {
                item.priority = novo.priority;
                if (item.priority !== 0) {
                  state.arquivosSelecionadosIndices.add(fileIndex);
                } else {
                  state.arquivosSelecionadosIndices.delete(fileIndex);
                }
              }
            }
          });
        }
      }
    }

    state.arquivosFiltradosAtuais = obterArquivosVisiveis();
    renderizarTabelaArquivosVirtualizada();
    atualizarResumoSelecao();
    atualizarHeaderTorrentSelecionado();
  } catch {
    // Ignora erros transitórios durante atualização silenciosa em background
  } finally {
    isAtualizandoSilenciosamente = false;
  }
}

export async function selecionarTorrent(torrent) {
  state.torrentSelecionadoAtual = torrent;

  const torrentFilesSection = document.getElementById('torrentFilesSection');
  const filesCountText = document.getElementById('filesCountText');
  const searchResultCount = document.getElementById('searchResultCount');
  const filesTableBody = document.getElementById('filesTableBody');
  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const filterStatusAll = document.getElementById('filterStatusAll');
  const filterOnlySelected = document.getElementById('filterOnlySelected');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const filesScrollArea = document.getElementById('filesScrollArea');

  document.querySelectorAll('.torrent-row').forEach((r) => {
    r.classList.toggle('selected', r.dataset.hash === torrent.hash);
  });

  if (torrentFilesSection) torrentFilesSection.style.display = 'flex';

  if (inputSearchFiles) inputSearchFiles.value = '';
  if (filterStatusAll) filterStatusAll.checked = true;
  if (filterOnlySelected) filterOnlySelected.checked = false;
  if (btnClearSearch) btnClearSearch.style.display = 'none';

  atualizarHeaderTorrentSelecionado();

  if (filesCountText) filesCountText.textContent = t('files_count_loading');
  if (searchResultCount) searchResultCount.textContent = t('files_count_loading');

  const colunasVisiveis = obterColunasVisiveis();
  const colCount = Math.max(1, colunasVisiveis.length);

  if (filesTableBody) {
    filesTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="${colCount}">
          <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h4>${t('empty_files_loading_title')}</h4>
            <p>${t('empty_files_loading_desc')}</p>
          </div>
        </td>
      </tr>
    `;
  }

  if (torrentFilesSection) {
    torrentFilesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  try {
    if (torrent.isCategoryVirtual && Array.isArray(torrent.torrentsList)) {
      const hashes = torrent.torrentsList.map((t) => t.hash);
      const { ok, data } = await apiService.getBatchTorrentFiles(hashes);
      const filesByHash = (ok && data?.sucesso && data?.filesByHash) ? data.filesByHash : {};

      const resultados = await executarComConcorrencia(torrent.torrentsList, 5, async (t) => {
        let files = filesByHash[t.hash];
        if (!files) {
          const resInd = await apiService.getTorrentFiles(t.hash);
          files = resInd.ok && resInd.data?.sucesso && Array.isArray(resInd.data.files) ? resInd.data.files : [];
        }
        return {
          torrent: t,
          files: Array.isArray(files) ? files : [],
        };
      });

      let todosArquivos = [];
      let globalIndex = 0;
      state.arquivosSelecionadosIndices = new Set();

      resultados.forEach(({ torrent: t, files }) => {
        files.forEach((f, idx) => {
          const fileIndex = typeof f.index === 'number' ? f.index : idx;
          const rawName = f.name || `arquivo_${fileIndex}`;
          const onlyFileName = extrairApenasNomeArquivo(rawName, f.path);
          const dirInterno = extrairApenasCaminho(f.path, rawName);
          const dirConsolidado = dirInterno === './' ? `[${t.name}]` : `[${t.name}]/${dirInterno}`;

          const itemConsolidado = {
            ...f,
            index: globalIndex,
            _globalIndex: globalIndex,
            _fileIndex: globalIndex,
            _originTorrentHash: t.hash,
            _originTorrentName: t.name,
            _originFileIndex: fileIndex,
            _fileName: onlyFileName,
            _dirPath: dirConsolidado,
            _searchNormalized: normalizarTextoBusca(`${onlyFileName} ${dirConsolidado} ${t.name} ${f.name || ''} ${f.path || ''}`),
          };
          itemConsolidado._searchLower = itemConsolidado._searchNormalized;

          if (itemConsolidado.priority !== 0) {
            state.arquivosSelecionadosIndices.add(globalIndex);
          }

          todosArquivos.push(itemConsolidado);
          globalIndex++;
        });
      });

      state.todosArquivosDoTorrent = todosArquivos;

      if (selectedTorrentMeta) {
        selectedTorrentMeta.textContent = t('files_meta_virtual', {
          count: formatNumber(todosArquivos.length),
          torrents: torrent.torrentsList.length,
          size: formatarTamanho(torrent.size),
        });
      }

      state.termoBuscaAtual = '';
      state.arquivosFiltradosAtuais = obterArquivosVisiveis();
      if (filesScrollArea) filesScrollArea.scrollTop = 0;

      atualizarIndicadoresOrdenacaoUI();
      renderizarTabelaArquivosVirtualizada();

      mostrarToast(
        t('toast_category_loaded_title'),
        t('toast_category_loaded_msg', {
          files: formatNumber(todosArquivos.length),
          torrents: torrent.torrentsList.length,
        }),
        'success'
      );
      return;
    }

    const { ok, data } = await apiService.getTorrentFiles(torrent.hash);

    if (ok && data?.sucesso) {
      state.todosArquivosDoTorrent = data.files || [];

      // Indexação instantânea em O(N)
      state.arquivosSelecionadosIndices = new Set();
      state.todosArquivosDoTorrent.forEach((f, idx) => {
        f._fileIndex = f.index !== undefined ? f.index : idx;
        f._fileName = extrairApenasNomeArquivo(f.name, f.path);
        f._dirPath = extrairApenasCaminho(f.path, f.name);
        f._searchNormalized = normalizarTextoBusca(`${f._fileName} ${f._dirPath} ${f.name || ''} ${f.path || ''}`);
        f._searchLower = f._searchNormalized;

        if (f.priority !== 0) {
          state.arquivosSelecionadosIndices.add(f._fileIndex);
        }
      });

      if (selectedTorrentMeta) {
        selectedTorrentMeta.textContent = t('files_meta_normal', {
          count: formatNumber(state.todosArquivosDoTorrent.length),
          size: formatarTamanho(torrent.size),
        });
      }

      state.termoBuscaAtual = '';
      state.arquivosFiltradosAtuais = obterArquivosVisiveis();
      if (filesScrollArea) filesScrollArea.scrollTop = 0;

      atualizarIndicadoresOrdenacaoUI();
      renderizarTabelaArquivosVirtualizada();

      mostrarToast(
        t('toast_files_loaded_title'),
        t('toast_files_loaded_msg', {
          count: formatNumber(state.todosArquivosDoTorrent.length),
        }),
        'success'
      );
    } else {
      state.todosArquivosDoTorrent = [];
      state.arquivosSelecionadosIndices.clear();
      if (filesCountText) filesCountText.textContent = t('toast_files_error_title');
      if (searchResultCount) searchResultCount.textContent = '0';
      if (filesTableBody) {
        filesTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="${colCount}">
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>${t('empty_files_failed_title')}</h4>
                <p>${data.erro || t('empty_files_failed_desc', { defaultValue: 'Não foi possível carregar os arquivos deste torrent.' })}</p>
              </div>
            </td>
          </tr>
        `;
      }
      atualizarResumoSelecao();
      mostrarToast(t('toast_files_error_title'), data.erro || t('toast_files_error_msg'), 'error');
    }
  } catch (err) {
    state.todosArquivosDoTorrent = [];
    state.arquivosSelecionadosIndices.clear();
    if (filesCountText) filesCountText.textContent = t('toast_network_error_title');
    if (searchResultCount) searchResultCount.textContent = 'Erro';
    if (filesTableBody) {
      filesTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="${colCount}">
            <div class="empty-state">
              <div class="empty-icon">✕</div>
              <h4>${t('empty_torrents_network_title')}</h4>
              <p>${err.message}</p>
            </div>
          </td>
        </tr>
      `;
    }
    atualizarResumoSelecao();
    mostrarToast(t('toast_network_error_title'), err.message, 'error');
  }
}

export function perguntarExclusaoArquivosFisicos(qtdDesativados) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalConfirmarExclusaoArquivos');
    const qtdEl = document.getElementById('modalExclusaoQtdDesativados');
    const btnFechar = document.getElementById('btnFecharModalExclusao');
    const btnCancelar = document.getElementById('btnModalExclusaoCancelar');
    const btnApenasDesativar = document.getElementById('btnModalExclusaoApenasDesativar');
    const btnApagarFisicos = document.getElementById('btnModalExclusaoApagarFisicos');

    if (qtdEl) qtdEl.textContent = formatNumber(qtdDesativados);

    if (!modal) {
      const fallbackMsg = `${t('modal_exclusao_desc', { count: formatNumber(qtdDesativados) })}\n\n${t('modal_exclusao_prompt')}`;
      const resposta = window.confirm(fallbackMsg);
      resolve(resposta);
      return;
    }

    modal.style.display = 'flex';

    const fechar = (resultado) => {
      modal.style.display = 'none';
      cleanup();
      resolve(resultado);
    };

    const onClickFechar = () => fechar(null);
    const onClickCancelar = () => fechar(null);
    const onClickApenasDesativar = () => fechar(false);
    const onClickApagarFisicos = () => fechar(true);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        fechar(null);
      }
    };

    const onBackdropClick = (e) => {
      if (e.target === modal) {
        fechar(null);
      }
    };

    const cleanup = () => {
      btnFechar?.removeEventListener('click', onClickFechar);
      btnCancelar?.removeEventListener('click', onClickCancelar);
      btnApenasDesativar?.removeEventListener('click', onClickApenasDesativar);
      btnApagarFisicos?.removeEventListener('click', onClickApagarFisicos);
      document.removeEventListener('keydown', onKeyDown);
      modal.removeEventListener('click', onBackdropClick);
    };

    btnFechar?.addEventListener('click', onClickFechar);
    btnCancelar?.addEventListener('click', onClickCancelar);
    btnApenasDesativar?.addEventListener('click', onClickApenasDesativar);
    btnApagarFisicos?.addEventListener('click', onClickApagarFisicos);
    document.addEventListener('keydown', onKeyDown);
    modal.addEventListener('click', onBackdropClick);
  });
}

async function enviarPrioridadesEmLotes(hash, marcados, desmarcados, apagarDesativados) {
  const CHUNK_SIZE = 1500;

  // Se ambos os arrays forem pequenos, envia direto em 1 única requisição rápida
  if (marcados.length <= CHUNK_SIZE && desmarcados.length <= CHUNK_SIZE) {
    return apiService.applyPriority(hash, {
      marcadosIndices: marcados,
      desmarcadosIndices: desmarcados,
      apagarDesativados,
    });
  }

  let totalMarcadosAlterados = 0;
  let totalDesmarcadosAlterados = 0;
  let totalArquivosApagados = 0;
  let totalEspacoLiberadoBytes = 0;
  let todosOk = true;

  // 1. Enviar marcados em blocos de 1500
  for (let i = 0; i < marcados.length; i += CHUNK_SIZE) {
    const chunk = marcados.slice(i, i + CHUNK_SIZE);
    const { ok, data } = await apiService.applyPriority(hash, {
      marcadosIndices: chunk,
      desmarcadosIndices: [],
      apagarDesativados: false,
    });
    if (ok && data.sucesso) {
      totalMarcadosAlterados += (data.marcadosAlterados || chunk.length);
    } else {
      todosOk = false;
    }
  }

  // 2. Enviar desmarcados em blocos de 1500 (exclusão no último bloco se solicitado)
  for (let i = 0; i < desmarcados.length; i += CHUNK_SIZE) {
    const chunk = desmarcados.slice(i, i + CHUNK_SIZE);
    const isLastChunk = (i + CHUNK_SIZE) >= desmarcados.length;
    const { ok, data } = await apiService.applyPriority(hash, {
      marcadosIndices: [],
      desmarcadosIndices: chunk,
      apagarDesativados: isLastChunk ? apagarDesativados : false,
    });
    if (ok && data.sucesso) {
      totalDesmarcadosAlterados += (data.desmarcadosAlterados || chunk.length);
      if (data.detalhes?.arquivosApagados) {
        totalArquivosApagados += (data.detalhes.arquivosApagados || 0);
        totalEspacoLiberadoBytes += (data.detalhes.espacoLiberadoBytes || 0);
      }
    } else {
      todosOk = false;
    }
  }

  return {
    ok: todosOk,
    data: {
      sucesso: todosOk,
      marcadosAlterados: totalMarcadosAlterados,
      desmarcadosAlterados: totalDesmarcadosAlterados,
      detalhes: {
        arquivosApagados: totalArquivosApagados,
        espacoLiberadoBytes: totalEspacoLiberadoBytes,
      },
    },
  };
}

export async function salvarPrioridades() {
  if (!state.torrentSelecionadoAtual || state.todosArquivosDoTorrent.length === 0) {
    mostrarToast(t('toast_warn_title'), t('toast_no_files_apply'), 'info');
    return;
  }

  const isVirtual = Boolean(state.torrentSelecionadoAtual.isCategoryVirtual);

  const marcadosIndices = [];
  const desmarcadosIndices = [];
  const recemDesativadosIndices = [];

  state.todosArquivosDoTorrent.forEach((f, idx) => {
    const fileIndex = f._fileIndex !== undefined ? f._fileIndex : (f.index !== undefined ? f.index : idx);
    const estaMarcado = state.arquivosSelecionadosIndices.has(fileIndex);
    const eraAtivo = Number(f.priority ?? 1) !== 0;

    if (estaMarcado) {
      marcadosIndices.push(fileIndex);
    } else {
      desmarcadosIndices.push(fileIndex);
      if (eraAtivo) {
        recemDesativadosIndices.push(fileIndex);
      }
    }
  });

  let apagarDesativados = false;

  // Pergunta sobre exclusão do disco APENAS se houver arquivos que eram ativos e foram recém-desativados nesta ação
  if (recemDesativadosIndices.length > 0) {
    const decisao = await perguntarExclusaoArquivosFisicos(recemDesativadosIndices.length);
    if (decisao === null) {
      // Usuário cancelou a operação no modal
      return;
    }
    apagarDesativados = Boolean(decisao);
  }

  const btnSalvarPrioridades = document.getElementById('btnSalvarPrioridades');
  const btnSalvarPrioridadesText = document.getElementById('btnSalvarPrioridadesText');
  const savePrioIcon = document.getElementById('savePrioIcon');

  if (btnSalvarPrioridades) btnSalvarPrioridades.disabled = true;
  if (savePrioIcon) savePrioIcon.classList.add('spin-animation');
  if (btnSalvarPrioridadesText) {
    btnSalvarPrioridadesText.textContent = apagarDesativados
      ? t('btn_syncing_deleting')
      : t('btn_syncing_sending');
  }

  try {
    if (isVirtual) {
      // Agrupa os arquivos por torrent de origem
      const porTorrent = new Map();

      state.todosArquivosDoTorrent.forEach((f) => {
        const hash = f._originTorrentHash;
        const originIndex = f._originFileIndex !== undefined ? f._originFileIndex : f.index;
        const globalIdx = f._fileIndex !== undefined ? f._fileIndex : f.index;

        if (!porTorrent.has(hash)) {
          porTorrent.set(hash, { marcados: [], desmarcados: [] });
        }

        if (state.arquivosSelecionadosIndices.has(globalIdx)) {
          porTorrent.get(hash).marcados.push(originIndex);
        } else {
          porTorrent.get(hash).desmarcados.push(originIndex);
        }
      });

      let totalApagados = 0;
      let totalBytesLiberados = 0;
      let algumErro = false;

      await executarComConcorrencia(Array.from(porTorrent.entries()), 3, async ([hash, { marcados, desmarcados }]) => {
        const { ok, data } = await enviarPrioridadesEmLotes(hash, marcados, desmarcados, apagarDesativados);
        if (ok && data?.sucesso) {
          if (data.detalhes?.arquivosApagados) {
            totalApagados += (data.detalhes.arquivosApagados || 0);
            totalBytesLiberados += (data.detalhes.espacoLiberadoBytes || 0);
          }
        } else {
          algumErro = true;
        }
      });

      if (!algumErro) {
        let msg = t('toast_cat_prio_applied_msg', {
          count: formatNumber(porTorrent.size),
          marked: formatNumber(marcadosIndices.length),
          unmarked: formatNumber(desmarcadosIndices.length),
        });
        if (apagarDesativados && totalApagados > 0) {
          msg += t('toast_cat_prio_deleted_msg', {
            count: formatNumber(totalApagados),
            space: formatarTamanho(totalBytesLiberados),
          });
        }
        mostrarToast(t('toast_cat_prio_applied_title'), msg, 'success');
        setFeedback('success', t('feedback_cat_synced_title'), msg);
        await selecionarTorrent(state.torrentSelecionadoAtual);
      } else {
        mostrarToast(t('toast_warn_title'), t('toast_cat_prio_partial'), 'warning');
        await selecionarTorrent(state.torrentSelecionadoAtual);
      }
      return;
    }

    const hash = state.torrentSelecionadoAtual.hash;
    const { ok, data } = await enviarPrioridadesEmLotes(hash, marcadosIndices, desmarcadosIndices, apagarDesativados);

    if (ok && data?.sucesso) {
      if (apagarDesativados && data.detalhes?.arquivosApagados !== undefined) {
        const qtdApagados = data.detalhes.arquivosApagados;
        const espacoStr = formatarTamanho(data.detalhes.espacoLiberadoBytes || 0);

        mostrarToast(
          t('toast_prio_disk_title'),
          t('toast_prio_disk_msg', {
            marked: formatNumber(marcadosIndices.length),
            unmarked: formatNumber(desmarcadosIndices.length),
            deleted: formatNumber(qtdApagados),
            space: espacoStr,
          }),
          'success'
        );

        setFeedback(
          'success',
          t('feedback_prio_disk_title'),
          t('feedback_prio_disk_detail', {
            deleted: formatNumber(qtdApagados),
            space: espacoStr,
          })
        );
      } else {
        mostrarToast(
          t('toast_prio_applied_title'),
          t('toast_prio_applied_msg', {
            marked: formatNumber(marcadosIndices.length),
            unmarked: formatNumber(desmarcadosIndices.length),
          }),
          'success'
        );

        setFeedback(
          'success',
          t('feedback_prio_title'),
          t('feedback_prio_detail', {
            name: state.torrentSelecionadoAtual.name,
          })
        );
      }

      await selecionarTorrent(state.torrentSelecionadoAtual);
    } else {
      const msgErro = data?.erro || t('toast_apply_error_title');
      mostrarToast(t('toast_apply_error_title'), msgErro, 'error');
      setFeedback('error', t('toast_apply_error_title'), msgErro);
    }
  } catch (err) {
    mostrarToast(t('toast_network_error_title'), err.message, 'error');
    setFeedback('error', t('toast_network_error_title'), err.message);
  } finally {
    if (btnSalvarPrioridades) btnSalvarPrioridades.disabled = false;
    if (savePrioIcon) savePrioIcon.classList.remove('spin-animation');
    if (btnSalvarPrioridadesText) btnSalvarPrioridadesText.textContent = t('btn_apply_priorities');
  }
}

// Função para solicitar a abertura da pasta do arquivo no sistema operacional
export async function acaoAbrirPastaArquivo(fileIndex) {
  if (!state.torrentSelecionadoAtual) return;

  const f = state.todosArquivosDoTorrent.find(
    (item) => (item._fileIndex !== undefined ? item._fileIndex : item.index) === fileIndex
  );

  const nomeArquivo = f ? (f._fileName || f.name || 'arquivo') : `arquivo #${fileIndex}`;
  const isDownloaded = f && typeof f.progress === 'number' && f.progress >= 0.9999;

  if (f && !isDownloaded) {
    const progStr = ((f.progress || 0) * 100).toFixed(1) + '%';
    mostrarToast(
      t('toast_not_downloaded_title'),
      t('toast_not_downloaded_msg', { name: nomeArquivo, prog: progStr }),
      'info'
    );
    return;
  }

  mostrarToast(t('toast_opening_folder_title'), t('toast_opening_folder_msg', { name: nomeArquivo }), 'info');

  try {
    const hash = (f && f._originTorrentHash) ? f._originTorrentHash : state.torrentSelecionadoAtual.hash;
    const originFileIndex = (f && f._originFileIndex !== undefined) ? f._originFileIndex : fileIndex;

    const { ok, data } = await apiService.openFileFolder(hash, originFileIndex);

    if (ok && data?.sucesso) {
      mostrarToast(
        t('toast_folder_opened_title'),
        t('toast_folder_opened_msg', { name: nomeArquivo }),
        'success'
      );
    } else {
      const msg = data?.mensagem || data?.erro || t('toast_folder_error_msg');
      mostrarToast(data?.naoBaixado ? t('toast_not_downloaded_title') : t('toast_warn_title'), msg, data?.naoBaixado ? 'info' : 'error');
    }
  } catch (err) {
    mostrarToast(t('toast_folder_error_title'), err.message, 'error');
  }
}

// Função para recarregar manualmente o estado e prioridades dos arquivos do torrent selecionado
export async function recarregarArquivosDoTorrentAtual() {
  if (!state.torrentSelecionadoAtual) {
    mostrarToast(t('toast_warn_title'), t('toast_warn_no_torrent_refresh'), 'info');
    return;
  }

  const btnRecarregar = document.getElementById('btnRecarregarArquivosTorrent');
  const refreshIcon = document.getElementById('refreshFilesIcon');
  const btnText = document.getElementById('btnRecarregarArquivosText');

  if (btnRecarregar) btnRecarregar.disabled = true;
  if (refreshIcon) refreshIcon.classList.add('spin-animation');
  if (btnText) btnText.textContent = t('btn_refreshing');

  try {
    const torrent = state.torrentSelecionadoAtual;

    if (torrent.isCategoryVirtual && Array.isArray(torrent.torrentsList)) {
      const hashes = torrent.torrentsList.map((t) => t.hash);
      const { ok, data } = await apiService.getBatchTorrentFiles(hashes);
      const filesByHash = (ok && data?.sucesso && data?.filesByHash) ? data.filesByHash : {};

      const resultados = await executarComConcorrencia(torrent.torrentsList, 5, async (t) => {
        let files = filesByHash[t.hash];
        if (!files) {
          const resInd = await apiService.getTorrentFiles(t.hash);
          files = resInd.ok && resInd.data?.sucesso && Array.isArray(resInd.data.files) ? resInd.data.files : [];
        }
        return {
          torrent: t,
          files: Array.isArray(files) ? files : [],
        };
      });

      const novosPorOrigem = new Map();
      resultados.forEach(({ torrent: t, files }) => {
        files.forEach((f, idx) => {
          const origIdx = typeof f.index === 'number' ? f.index : idx;
          novosPorOrigem.set(`${t.hash}_${origIdx}`, f);
        });
      });

      if (state.todosArquivosDoTorrent.length > 0) {
        state.todosArquivosDoTorrent.forEach((item) => {
          const key = `${item._originTorrentHash}_${item._originFileIndex}`;
          const novo = novosPorOrigem.get(key);
          if (novo) {
            item.progress = typeof novo.progress === 'number' ? novo.progress : item.progress;
            item.size = novo.size || item.size;
            item.isAvailable = Boolean(novo.is_seed || novo.availability > 0 || item.isAvailable);

            if (typeof novo.priority === 'number') {
              item.priority = novo.priority;
              const globalIdx = item._fileIndex !== undefined ? item._fileIndex : item.index;
              if (item.priority !== 0) {
                state.arquivosSelecionadosIndices.add(globalIdx);
              } else {
                state.arquivosSelecionadosIndices.delete(globalIdx);
              }
            }
          }
        });
      }
    } else {
      const { ok, data } = await apiService.getTorrentFiles(torrent.hash);
      if (ok && data?.sucesso && Array.isArray(data.files)) {
        const novosPorIdx = new Map();
        data.files.forEach((f, idx) => {
          const fileIndex = typeof f.index === 'number' ? f.index : idx;
          novosPorIdx.set(fileIndex, f);
        });

        if (state.todosArquivosDoTorrent.length > 0) {
          state.todosArquivosDoTorrent.forEach((item) => {
            const fileIndex = item._fileIndex !== undefined ? item._fileIndex : item.index;
            const novo = novosPorIdx.get(fileIndex);
            if (novo) {
              item.progress = typeof novo.progress === 'number' ? novo.progress : item.progress;
              item.size = novo.size || item.size;
              item.isAvailable = Boolean(novo.is_seed || novo.availability > 0 || item.isAvailable);

              if (typeof novo.priority === 'number') {
                item.priority = novo.priority;
                if (item.priority !== 0) {
                  state.arquivosSelecionadosIndices.add(fileIndex);
                } else {
                  state.arquivosSelecionadosIndices.delete(fileIndex);
                }
              }
            }
          });
        }
      } else {
        mostrarToast(t('toast_files_error_title'), data?.erro || t('toast_files_error_msg'), 'error');
        return;
      }
    }

    state.arquivosFiltradosAtuais = obterArquivosVisiveis();
    renderizarTabelaArquivosVirtualizada();
    atualizarResumoSelecao();
    atualizarHeaderTorrentSelecionado();

    mostrarToast(
      t('toast_torrent_refreshed_title'),
      t('toast_torrent_refreshed_msg'),
      'success'
    );
  } catch (err) {
    mostrarToast(t('toast_network_error_title'), err.message, 'error');
  } finally {
    if (btnRecarregar) btnRecarregar.disabled = false;
    if (refreshIcon) refreshIcon.classList.remove('spin-animation');
    if (btnText) btnText.textContent = t('btn_reload_files');
  }
}

// ==========================================
// 9. INICIALIZAÇÃO DE LISTENERS
// ==========================================

export function initFilesManager() {
  const filesTableBody = document.getElementById('filesTableBody');
  const filesScrollArea = document.getElementById('filesScrollArea');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnDeselectAll = document.getElementById('btnDeselectAll');
  const btnInvertSelection = document.getElementById('btnInvertSelection');
  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const filterOnlySelected = document.getElementById('filterOnlySelected');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const btnFecharArquivos = document.getElementById('btnFecharArquivos');
  const btnSalvarPrioridades = document.getElementById('btnSalvarPrioridades');
  const btnRecarregarArquivosTorrent = document.getElementById('btnRecarregarArquivosTorrent');
  const torrentFilesSection = document.getElementById('torrentFilesSection');
  const headerRow = document.getElementById('filesTableHeaderRow');

  // Inicializa Resizers, Drag & Drop e Menu de Contexto
  initColumnResizers();
  initColumnReordering();
  initFilesContextMenu();

  // Listener de clique nos cabeçalhos para ordenação
  headerRow?.addEventListener('click', (e) => {
    if (e.target.closest('.col-resizer')) return;

    const th = e.target.closest('th.sortable-th');
    if (!th) return;

    const colId = th.dataset.col;
    if (colId) {
      alterarOrdenacao(colId);
    }
  });

  // Event Delegation no corpo da tabela
  filesTableBody?.addEventListener('click', (e) => {
    // 1. Se clicou no checkbox ou no label do checkbox, deixa o comportamento do checkbox agir
    if (e.target.classList.contains('file-check-input') || e.target.closest('label.file-check-label')) {
      return;
    }

    const tr = e.target.closest('.torrent-file-row');
    if (!tr) return;
    const index = Number(tr.dataset.index);
    if (isNaN(index)) return;

    // 2. Se clicou no nome do arquivo ou no botão de abrir pasta:
    const targetFolderAction = e.target.closest('[data-action="open-folder"]') || e.target.closest('.file-name-text') || e.target.closest('.btn-file-open-folder');
    if (targetFolderAction) {
      e.stopPropagation();
      acaoAbrirPastaArquivo(index);
      return;
    }

    // 3. Caso contrário (clique no restante da linha: índice, caminho, tamanho, prioridade, progresso), alterna seleção
    alternarSelecaoArquivo(index);
  });

  // Double-click na linha também abre a pasta se o arquivo estiver baixado
  filesTableBody?.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('.torrent-file-row');
    if (!tr) return;
    const index = Number(tr.dataset.index);
    if (isNaN(index)) return;

    acaoAbrirPastaArquivo(index);
  });

  filesTableBody?.addEventListener('change', (e) => {
    if (e.target.classList.contains('file-check-input')) {
      const index = Number(e.target.dataset.index);
      if (!isNaN(index)) {
        alternarSelecaoArquivo(index, e.target.checked);
      }
    }
  });

  // Ações de seleção em massa
  btnSelectAll?.addEventListener('click', () => {
    const visiveis = obterArquivosVisiveis();
    if (visiveis.length === 0) return;

    visiveis.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      state.arquivosSelecionadosIndices.add(fileIndex);
    });

    renderizarTabelaArquivosVirtualizada();
    const termo = (inputSearchFiles?.value || '').trim();
    mostrarToast(
      t('toast_bulk_title'),
      termo
        ? t('toast_bulk_selected_visible', { count: formatNumber(visiveis.length) })
        : t('toast_bulk_selected_all', { count: formatNumber(visiveis.length) }),
      'success'
    );
  });

  btnDeselectAll?.addEventListener('click', () => {
    const visiveis = obterArquivosVisiveis();
    if (visiveis.length === 0) return;

    visiveis.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      state.arquivosSelecionadosIndices.delete(fileIndex);
    });

    renderizarTabelaArquivosVirtualizada();
    const termo = (inputSearchFiles?.value || '').trim();
    mostrarToast(
      t('toast_bulk_title'),
      termo
        ? t('toast_bulk_deselected_visible', { count: formatNumber(visiveis.length) })
        : t('toast_bulk_deselected_all', { count: formatNumber(visiveis.length) }),
      'info'
    );
  });

  btnInvertSelection?.addEventListener('click', () => {
    const visiveis = obterArquivosVisiveis();
    if (visiveis.length === 0) return;

    let totalInvertidos = 0;
    visiveis.forEach((f) => {
      const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;
      const novoEstado = !state.arquivosSelecionadosIndices.has(fileIndex);

      if (novoEstado) {
        state.arquivosSelecionadosIndices.add(fileIndex);
      } else {
        state.arquivosSelecionadosIndices.delete(fileIndex);
      }
      totalInvertidos++;
    });

    renderizarTabelaArquivosVirtualizada();
    const termo = (inputSearchFiles?.value || '').trim();
    mostrarToast(
      t('toast_bulk_invert_title'),
      termo
        ? t('toast_bulk_invert_visible', { count: formatNumber(totalInvertidos) })
        : t('toast_bulk_invert_all', { count: formatNumber(totalInvertidos) }),
      'info'
    );
  });

  // Filtros e busca
  inputSearchFiles?.addEventListener('input', filtrarArquivosInstantaneamente);
  document.querySelectorAll('input[name="fileStatusFilter"]').forEach((radio) => {
    radio.addEventListener('change', filtrarArquivosInstantaneamente);
  });
  filterOnlySelected?.addEventListener('change', filtrarArquivosInstantaneamente);

  btnClearSearch?.addEventListener('click', () => {
    if (inputSearchFiles) inputSearchFiles.value = '';
    filtrarArquivosInstantaneamente();
    if (inputSearchFiles) inputSearchFiles.focus();
  });

  inputSearchFiles?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inputSearchFiles.value = '';
      filtrarArquivosInstantaneamente();
    }
  });

  // Scroll virtualizado
  filesScrollArea?.addEventListener('scroll', () => {
    if (scrollRafId) cancelAnimationFrame(scrollRafId);
    scrollRafId = requestAnimationFrame(() => {
      renderizarTabelaArquivosVirtualizada();
    });
  }, { passive: true });

  // Fechar arquivos
  btnFecharArquivos?.addEventListener('click', () => {
    if (torrentFilesSection) torrentFilesSection.style.display = 'none';
    state.torrentSelecionadoAtual = null;
    state.todosArquivosDoTorrent = [];
    state.arquivosSelecionadosIndices.clear();
    document.querySelectorAll('.torrent-row').forEach((r) => r.classList.remove('selected'));
  });

  // Salvar prioridades
  btnSalvarPrioridades?.addEventListener('click', salvarPrioridades);

  // Recarregar arquivos do torrent a partir do qBittorrent
  btnRecarregarArquivosTorrent?.addEventListener('click', recarregarArquivosDoTorrentAtual);

  // Listener de mudança de idioma para atualizar renderização dinâmica do gerenciador de arquivos
  window.addEventListener('languageChanged', () => {
    renderizarOrdemColunasHeader();
    renderizarItensMenuContexto();
    renderizarTabelaArquivosVirtualizada();
    atualizarResumoSelecao();
    if (state.torrentSelecionadoAtual) {
      atualizarHeaderTorrentSelecionado();
    }
  });
}
