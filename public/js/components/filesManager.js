/**
 * Componente do Gerenciador de Arquivos do Torrent
 * Inclui: Virtualização (Windowing DOM), Pesquisa Instantânea, Seleção em Massa e Aplicação de Prioridades
 */

import { state } from '../state.js';
import { apiService } from '../services/apiService.js';
import { formatarTamanho, formatarPrioridade, mapearStatusLegivel } from '../utils/formatters.js';
import { mostrarToast } from './toast.js';
import { setFeedback } from './diagnostics.js';

const ROW_HEIGHT = 44; // Altura fixa de cada linha em pixels
const BUFFER_COUNT = 15; // Buffer de linhas renderizadas no viewport para 60 FPS
let scrollRafId = null;

// Atualiza o resumo visual de contagem e tamanho dos arquivos marcados
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
}

// Alterna o estado de seleção de um arquivo individual
export function alternarSelecaoArquivo(index, forcarEstado = null) {
  const isMarcado = forcarEstado !== null
    ? forcarEstado
    : !state.arquivosSelecionadosIndices.has(index);

  if (isMarcado) {
    state.arquivosSelecionadosIndices.add(index);
  } else {
    state.arquivosSelecionadosIndices.delete(index);
  }

  // Atualiza a linha no DOM se estiver visível no viewport
  const tr = document.querySelector(`.torrent-file-row[data-index="${index}"]`);
  if (tr) {
    tr.classList.toggle('checked', isMarcado);
    const checkbox = tr.querySelector('.file-check-input');
    if (checkbox) checkbox.checked = isMarcado;
  }

  atualizarResumoSelecao();
}

// Filtra arquivos por termo de busca e status de prioridade
export function obterArquivosVisiveis() {
  if (!state.todosArquivosDoTorrent || state.todosArquivosDoTorrent.length === 0) {
    return [];
  }

  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const filterHideIgnored = document.getElementById('filterHideIgnored');
  const filterOnlySelected = document.getElementById('filterOnlySelected');

  const termo = (inputSearchFiles?.value || '').trim().toLowerCase();
  const ocultarIgnorados = Boolean(filterHideIgnored?.checked);
  const apenasSelecionados = Boolean(filterOnlySelected?.checked);

  return state.todosArquivosDoTorrent.filter((f) => {
    const fileIndex = f._fileIndex !== undefined ? f._fileIndex : f.index;

    // 1. Filtro: Ocultar ignorados (priority === 0)
    if (ocultarIgnorados && f.priority === 0) {
      return false;
    }

    // 2. Filtro: Apenas selecionados
    if (apenasSelecionados && !state.arquivosSelecionadosIndices.has(fileIndex)) {
      return false;
    }

    // 3. Filtro: Pesquisa instantânea pré-indexada
    if (termo) {
      const searchStr = f._searchLower || ((f.name || '') + ' ' + (f.path || '')).toLowerCase();
      if (!searchStr.includes(termo)) {
        return false;
      }
    }

    return true;
  });
}

// Filtra arquivos e renderiza a lista
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

// Renderização Virtualizada (Windowing DOM) para listas de até 100.000+ arquivos
export function renderizarTabelaArquivosVirtualizada() {
  const searchResultCount = document.getElementById('searchResultCount');
  const filesCountText = document.getElementById('filesCountText');
  const filesTableBody = document.getElementById('filesTableBody');
  const filesScrollArea = document.getElementById('filesScrollArea');

  if (!filesTableBody) return;

  const totalOriginal = state.todosArquivosDoTorrent.length;
  const totalFiltrado = state.arquivosFiltradosAtuais.length;

  if (state.termoBuscaAtual !== '') {
    if (searchResultCount) searchResultCount.textContent = `${totalFiltrado.toLocaleString('pt-BR')} de ${totalOriginal.toLocaleString('pt-BR')} arquivos`;
    if (filesCountText) filesCountText.textContent = `Exibindo ${totalFiltrado.toLocaleString('pt-BR')} arquivos para "${state.termoBuscaAtual}"`;
  } else {
    if (searchResultCount) searchResultCount.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos disponíveis`;
    if (filesCountText) filesCountText.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos carregados`;
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

  // Renderiza apenas os itens visíveis no viewport
  for (let i = startIndex; i < endIndex; i++) {
    const f = state.arquivosFiltradosAtuais[i];
    const fileIndex = f._fileIndex !== undefined ? f._fileIndex : (f.index !== undefined ? f.index : i);
    const isSelected = state.arquivosSelecionadosIndices.has(fileIndex);

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

// Seleciona um torrent e carrega seus arquivos
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
  const filterHideIgnored = document.getElementById('filterHideIgnored');
  const filterOnlySelected = document.getElementById('filterOnlySelected');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const filesScrollArea = document.getElementById('filesScrollArea');

  // Destaca a linha selecionada na tabela de torrents
  document.querySelectorAll('.torrent-row').forEach((r) => {
    r.classList.toggle('selected', r.dataset.hash === torrent.hash);
  });

  if (torrentFilesSection) torrentFilesSection.style.display = 'flex';
  if (selectedTorrentName) selectedTorrentName.textContent = torrent.name;
  if (selectedTorrentMeta) selectedTorrentMeta.textContent = `Tamanho total: ${formatarTamanho(torrent.size)}`;

  if (inputSearchFiles) inputSearchFiles.value = '';
  if (filterHideIgnored) filterHideIgnored.checked = false;
  if (filterOnlySelected) filterOnlySelected.checked = false;
  if (btnClearSearch) btnClearSearch.style.display = 'none';

  const statusInfo = mapearStatusLegivel(torrent.status, torrent.rawState);
  if (selectedTorrentStatus) selectedTorrentStatus.textContent = statusInfo.label;
  if (filesHashTag) filesHashTag.textContent = `Hash: ${torrent.hash}`;
  if (filesCountText) filesCountText.textContent = 'Carregando arquivos do torrent...';
  if (searchResultCount) searchResultCount.textContent = 'Carregando lista...';

  if (filesTableBody) {
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
  }

  if (torrentFilesSection) {
    torrentFilesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  try {
    const { ok, data } = await apiService.getTorrentFiles(torrent.hash);

    if (ok && data.sucesso) {
      state.todosArquivosDoTorrent = data.files || [];

      // Pré-processamento e indexação instantânea em O(N)
      state.arquivosSelecionadosIndices = new Set();
      state.todosArquivosDoTorrent.forEach((f, idx) => {
        f._fileIndex = f.index !== undefined ? f.index : idx;
        f._searchLower = ((f.name || '') + ' ' + (f.path || '')).toLowerCase();

        if (f.priority !== 0) {
          state.arquivosSelecionadosIndices.add(f._fileIndex);
        }
      });

      if (selectedTorrentMeta) {
        selectedTorrentMeta.textContent = `${state.todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos • ${formatarTamanho(torrent.size)} no total`;
      }

      state.termoBuscaAtual = '';
      state.arquivosFiltradosAtuais = state.todosArquivosDoTorrent;
      if (filesScrollArea) filesScrollArea.scrollTop = 0;

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
            <td colspan="7">
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
    atualizarResumoSelecao();
    mostrarToast('Erro de Rede', err.message, 'error');
  }
}

// Salva as prioridades dos arquivos marcados/desmarcados no cliente BitTorrent
export async function salvarPrioridades() {
  if (!state.torrentSelecionadoAtual || state.todosArquivosDoTorrent.length === 0) {
    mostrarToast('Aviso', 'Nenhum torrent ou arquivo selecionado para aplicar prioridades.', 'info');
    return;
  }

  const btnSalvarPrioridades = document.getElementById('btnSalvarPrioridades');
  const btnSalvarPrioridadesText = document.getElementById('btnSalvarPrioridadesText');
  const savePrioIcon = document.getElementById('savePrioIcon');

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

  if (btnSalvarPrioridades) btnSalvarPrioridades.disabled = true;
  if (savePrioIcon) savePrioIcon.classList.add('spin-animation');
  if (btnSalvarPrioridadesText) btnSalvarPrioridadesText.textContent = 'Enviando ao qBittorrent...';

  try {
    const hash = state.torrentSelecionadoAtual.hash;
    const { ok, data } = await apiService.applyPriority(hash, {
      marcadosIndices,
      desmarcadosIndices,
    });

    if (ok && data.sucesso) {
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

      // Recarrega arquivos para atualizar interface
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

export function initFilesManager() {
  const filesTableBody = document.getElementById('filesTableBody');
  const filesScrollArea = document.getElementById('filesScrollArea');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnDeselectAll = document.getElementById('btnDeselectAll');
  const btnInvertSelection = document.getElementById('btnInvertSelection');
  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const filterHideIgnored = document.getElementById('filterHideIgnored');
  const filterOnlySelected = document.getElementById('filterOnlySelected');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const btnFecharArquivos = document.getElementById('btnFecharArquivos');
  const btnSalvarPrioridades = document.getElementById('btnSalvarPrioridades');
  const torrentFilesSection = document.getElementById('torrentFilesSection');

  // Event Delegation no container de arquivos
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
  filterHideIgnored?.addEventListener('change', filtrarArquivosInstantaneamente);
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
