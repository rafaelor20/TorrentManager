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

const ROW_HEIGHT = 44; // Altura fixa de cada linha em pixels
const BUFFER_COUNT = 15; // Buffer de linhas renderizadas no viewport

const LOCAL_STORAGE_WIDTHS_KEY = 'torrentmanager_files_col_widths';
const LOCAL_STORAGE_ORDER_KEY = 'torrentmanager_files_col_order';
const LOCAL_STORAGE_HIDDEN_KEY = 'torrentmanager_files_hidden_cols';

export const COLUNAS_INFO = {
  check: { label: 'Marcar', tag: 'Checkbox', defaultWidth: 54, minWidth: 44 },
  index: { label: '# Índice', tag: 'Índice', defaultWidth: 60, minWidth: 45 },
  name: { label: 'Nome do Arquivo', tag: 'Texto', defaultWidth: 320, minWidth: 140 },
  path: { label: 'Caminho Completo', tag: 'Texto', defaultWidth: 360, minWidth: 140 },
  size: { label: 'Tamanho', tag: 'Bytes', defaultWidth: 120, minWidth: 80 },
  priority: { label: 'Prioridade Atual', tag: 'Status', defaultWidth: 150, minWidth: 110 },
  progress: { label: 'Progresso', tag: 'Barra', defaultWidth: 140, minWidth: 100 },
};

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

  if (badgeCountAll) badgeCountAll.textContent = total.toLocaleString('pt-BR');
  if (badgeCountActive) badgeCountActive.textContent = countActive.toLocaleString('pt-BR');
  if (badgeCountInactive) badgeCountInactive.textContent = countInactive.toLocaleString('pt-BR');
  if (badgeCountSelected) badgeCountSelected.textContent = countSelected.toLocaleString('pt-BR');
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
    filesSelectionBadge.textContent = `${totalSelecionados.toLocaleString('pt-BR')} marcados`;
  }
  if (selectionSummaryCount) {
    selectionSummaryCount.textContent = `${totalSelecionados.toLocaleString('pt-BR')} de ${totalArquivos.toLocaleString('pt-BR')} selecionados`;
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
          <label class="file-check-label" title="Marcar ou desmarcar arquivo">
            <input type="checkbox" class="file-check-input" data-index="${fileIndex}" ${isSelected ? 'checked' : ''}>
            <span class="file-custom-check"></span>
          </label>
        </td>
      `;
    case 'index':
      return `<td class="cell-file-index">${fileIndex}</td>`;
    case 'name': {
      const nomeArquivo = f._fileName || extrairApenasNomeArquivo(f.name, f.path);
      return `
        <td class="cell-file-name">
          <span class="file-name-text" title="${nomeArquivo}">${nomeArquivo}</span>
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
    if (searchResultCount) searchResultCount.textContent = `${totalFiltrado.toLocaleString('pt-BR')} de ${totalOriginal.toLocaleString('pt-BR')} arquivos`;
    if (filesCountText) filesCountText.textContent = `Exibindo ${totalFiltrado.toLocaleString('pt-BR')} arquivos para "${state.termoBuscaAtual}"`;
  } else if (totalFiltrado !== totalOriginal) {
    if (searchResultCount) searchResultCount.textContent = `${totalFiltrado.toLocaleString('pt-BR')} de ${totalOriginal.toLocaleString('pt-BR')} arquivos filtrados`;
    if (filesCountText) filesCountText.textContent = `Exibindo ${totalFiltrado.toLocaleString('pt-BR')} de ${totalOriginal.toLocaleString('pt-BR')} arquivos filtrados`;
  } else {
    if (searchResultCount) searchResultCount.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos disponíveis`;
    if (filesCountText) filesCountText.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos carregados`;
  }

  if (totalFiltrado === 0) {
    filesTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="${colCount}">
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
    mostrarToast('Coluna Ajustada', `Largura padrão restaurada para "${COLUNAS_INFO[colId]?.label || colId}".`, 'info');
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
      mostrarToast('Ordem Atualizada', 'Posição da coluna reorganizada com sucesso!', 'info');
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
      mostrarToast('Aviso', 'Pelo menos uma coluna deve permanecer visível na tabela.', 'error');
      return;
    }
    state.hiddenColumns.add(colId);
  }

  salvarColunasOcultas();
  renderizarOrdemColunasHeader();
  renderizarItensMenuContexto();
  renderizarTabelaArquivosVirtualizada();

  const info = COLUNAS_INFO[colId];
  const acaoStr = isOculta ? 'exibida' : 'ocultada';
  mostrarToast('Coluna Atualizada', `Coluna "${info?.label || colId}" foi ${acaoStr}.`, 'info');
}

export function exibirTodasColunas() {
  state.hiddenColumns.clear();
  salvarColunasOcultas();
  renderizarOrdemColunasHeader();
  renderizarItensMenuContexto();
  renderizarTabelaArquivosVirtualizada();
  mostrarToast('Colunas Restauradas', 'Todas as 7 colunas estão visíveis.', 'success');
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
  mostrarToast('Padrão Restaurado', 'Ordem, larguras e visibilidade das colunas foram redefinidas.', 'info');
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
      <div class="context-menu-item ${isVisible ? 'is-visible' : ''} ${isLastVisible ? 'is-disabled' : ''}" data-col="${colId}" title="${isLastVisible ? 'Não é possível ocultar a única coluna visível' : 'Clique para alternar visibilidade'}">
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

export async function selecionarTorrent(torrent) {
  state.torrentSelecionadoAtual = torrent;

  const torrentFilesSection = document.getElementById('torrentFilesSection');
  const selectedTorrentName = document.getElementById('selectedTorrentName');
  const selectedTorrentMeta = document.getElementById('selectedTorrentMeta');
  const selectedTorrentStatus = document.getElementById('selectedTorrentStatus');
  const filesHashTag = document.getElementById('filesHashTag');
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
  if (selectedTorrentName) selectedTorrentName.textContent = torrent.name;
  if (selectedTorrentMeta) selectedTorrentMeta.textContent = `Tamanho total: ${formatarTamanho(torrent.size)}`;

  if (inputSearchFiles) inputSearchFiles.value = '';
  if (filterStatusAll) filterStatusAll.checked = true;
  if (filterOnlySelected) filterOnlySelected.checked = false;
  if (btnClearSearch) btnClearSearch.style.display = 'none';

  const statusInfo = mapearStatusLegivel(torrent.status, torrent.rawState);
  if (selectedTorrentStatus) selectedTorrentStatus.textContent = statusInfo.label;
  if (filesHashTag) filesHashTag.textContent = `Hash: ${torrent.hash}`;
  if (filesCountText) filesCountText.textContent = 'Carregando arquivos do torrent...';
  if (searchResultCount) searchResultCount.textContent = 'Carregando lista...';

  const colunasVisiveis = obterColunasVisiveis();
  const colCount = Math.max(1, colunasVisiveis.length);

  if (filesTableBody) {
    filesTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="${colCount}">
          <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h4>Carregando arquivos...</h4>
            <p>Buscando todos os arquivos de "${torrent.name}"...</p>
          </div>
        </td>
      </tr>
    `;
  }

  if (torrentFilesSection) {
    torrentFilesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  try {
    const { ok, data } = await apiService.getTorrentFiles(torrent.hash);

    if (ok && data.sucesso) {
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
        selectedTorrentMeta.textContent = `${state.todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos • ${formatarTamanho(torrent.size)} no total`;
      }

      state.termoBuscaAtual = '';
      state.arquivosFiltradosAtuais = obterArquivosVisiveis();
      if (filesScrollArea) filesScrollArea.scrollTop = 0;

      atualizarIndicadoresOrdenacaoUI();
      renderizarTabelaArquivosVirtualizada();

      mostrarToast(
        'Arquivos Carregados',
        `${state.todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos carregados com sucesso (Virtualização Ativa).`,
        'success'
      );
    } else {
      state.todosArquivosDoTorrent = [];
      state.arquivosSelecionadosIndices.clear();
      if (filesCountText) filesCountText.textContent = 'Erro ao carregar arquivos';
      if (searchResultCount) searchResultCount.textContent = '0 arquivos';
      if (filesTableBody) {
        filesTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="${colCount}">
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>Falha ao carregar arquivos</h4>
                <p>${data.erro || 'Não foi possível carregar os arquivos deste torrent.'}</p>
              </div>
            </td>
          </tr>
        `;
      }
      atualizarResumoSelecao();
      mostrarToast('Erro', data.erro || 'Falha ao carregar arquivos do torrent.', 'error');
    }
  } catch (err) {
    state.todosArquivosDoTorrent = [];
    state.arquivosSelecionadosIndices.clear();
    if (filesCountText) filesCountText.textContent = 'Erro de comunicação';
    if (searchResultCount) searchResultCount.textContent = 'Erro';
    if (filesTableBody) {
      filesTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="${colCount}">
            <div class="empty-state">
              <div class="empty-icon">✕</div>
              <h4>Erro de rede</h4>
              <p>${err.message}</p>
            </div>
          </td>
        </tr>
      `;
    }
    atualizarResumoSelecao();
    mostrarToast('Erro de Rede', err.message, 'error');
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

    if (!modal) {
      const resposta = window.confirm(
        `Você marcou ${qtdDesativados} arquivo(s) como desativados (Não Baixar).\n\nDeseja também apagá-los do sistema de arquivos (disco)?\n- OK: Sim, apagar do disco\n- Cancelar: Não, apenas desativar`
      );
      resolve(resposta);
      return;
    }

    if (qtdEl) qtdEl.textContent = qtdDesativados.toLocaleString('pt-BR');
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

export async function salvarPrioridades() {
  if (!state.torrentSelecionadoAtual || state.todosArquivosDoTorrent.length === 0) {
    mostrarToast('Aviso', 'Nenhum torrent ou arquivo selecionado para aplicar prioridades.', 'info');
    return;
  }

  const marcadosIndices = [];
  const desmarcadosIndices = [];

  state.todosArquivosDoTorrent.forEach((f, idx) => {
    const fileIndex = f.index !== undefined ? f.index : idx;
    if (state.arquivosSelecionadosIndices.has(fileIndex)) {
      marcadosIndices.push(fileIndex);
    } else {
      desmarcadosIndices.push(fileIndex);
    }
  });

  let apagarDesativados = false;

  // Se houver arquivos desativados (Não Baixar / prioridade 0), pergunta se deve apagá-los do disco
  if (desmarcadosIndices.length > 0) {
    const decisao = await perguntarExclusaoArquivosFisicos(desmarcadosIndices.length);
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
      ? 'Excluindo arquivos e sincronizando...'
      : 'Enviando ao qBittorrent...';
  }

  try {
    const hash = state.torrentSelecionadoAtual.hash;
    const { ok, data } = await apiService.applyPriority(hash, {
      marcadosIndices,
      desmarcadosIndices,
      apagarDesativados,
    });

    if (ok && data.sucesso) {
      if (apagarDesativados && data.detalhes?.arquivosApagados !== undefined) {
        const qtdApagados = data.detalhes.arquivosApagados;
        const espacoStr = formatarTamanho(data.detalhes.espacoLiberadoBytes || 0);

        mostrarToast(
          'Prioridades e Disco Atualizados!',
          `${marcadosIndices.length} arquivos marcados (Normal), ${desmarcadosIndices.length} desativados e ${qtdApagados} arquivo(s) apagado(s) do disco (${espacoStr} liberados).`,
          'success'
        );

        setFeedback(
          'success',
          'Prioridades e Disco Atualizados',
          `As prioridades foram sincronizadas com o qBittorrent e ${qtdApagados} arquivo(s) desativado(s) foram apagados do disco local (${espacoStr} liberados).`
        );
      } else {
        mostrarToast(
          'Prioridades Aplicadas!',
          `${marcadosIndices.length} arquivos marcados como Normal (1) e ${desmarcadosIndices.length} como Não Baixar (0).`,
          'success'
        );

        setFeedback(
          'success',
          'Prioridades Atualizadas no qBittorrent',
          `As prioridades do torrent "${state.torrentSelecionadoAtual.name}" foram sincronizadas com sucesso com o cliente BitTorrent.`
        );
      }

      await selecionarTorrent(state.torrentSelecionadoAtual);
    } else {
      const msgErro = data.erro || 'Falha ao aplicar prioridades no qBittorrent.';
      mostrarToast('Erro ao Aplicar', msgErro, 'error');
      setFeedback('error', 'Falha ao aplicar prioridades', msgErro);
    }
  } catch (err) {
    mostrarToast('Erro de Rede', `Falha de comunicação: ${err.message}`, 'error');
    setFeedback('error', 'Erro de Comunicação', err.message);
  } finally {
    if (btnSalvarPrioridades) btnSalvarPrioridades.disabled = false;
    if (savePrioIcon) savePrioIcon.classList.remove('spin-animation');
    if (btnSalvarPrioridadesText) btnSalvarPrioridadesText.textContent = 'Aplicar Prioridades';
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
    const tr = e.target.closest('.torrent-file-row');
    if (!tr) return;
    const index = Number(tr.dataset.index);
    if (isNaN(index)) return;

    if (e.target.classList.contains('file-check-input') || e.target.closest('label.file-check-label')) {
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
      state.arquivosSelecionadosIndices.delete(fileIndex);
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
      'Seleção Invertida',
      termo
        ? `Seleção invertida para ${totalInvertidos.toLocaleString('pt-BR')} arquivos visíveis.`
        : `Seleção invertida para todos os ${totalInvertidos.toLocaleString('pt-BR')} arquivos.`,
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
}
