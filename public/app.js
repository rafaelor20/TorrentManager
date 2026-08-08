// Frontend do TorrentManager — Etapas 1 a 6 (Pesquisa Instantânea)
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

  // Elementos da seção de arquivos (Etapa 5) e Pesquisa (Etapa 6)
  const torrentFilesSection = document.getElementById('torrentFilesSection');
  const selectedTorrentName = document.getElementById('selectedTorrentName');
  const selectedTorrentMeta = document.getElementById('selectedTorrentMeta');
  const selectedTorrentStatus = document.getElementById('selectedTorrentStatus');
  const filesCountText = document.getElementById('filesCountText');
  const filesHashTag = document.getElementById('filesHashTag');
  const filesTableBody = document.getElementById('filesTableBody');
  const btnFecharArquivos = document.getElementById('btnFecharArquivos');
  
  // Pesquisa instantânea (Etapa 6)
  const inputSearchFiles = document.getElementById('inputSearchFiles');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const searchResultCount = document.getElementById('searchResultCount');

  // Formulário de conexão
  const formConnection = document.getElementById('formConnection');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputUsername = document.getElementById('inputUsername');
  const inputPassword = document.getElementById('inputPassword');
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
  const infoCookieStatus = document.getElementById('infoCookieStatus');
  const btnTestarConexao = document.getElementById('btnTestarConexao');
  const btnDesconectar = document.getElementById('btnDesconectar');

  // Toasts
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastCloseBtn = document.getElementById('toastCloseBtn');

  // Estado em memória
  let torrentSelecionadoAtual = null;
  let todosArquivosDoTorrent = []; // Cache em memória dos arquivos do torrent selecionado

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
  // ETAPA 6: PESQUISA INSTANTÂNEA
  // ==========================================
  function filtrarArquivosInstantaneamente() {
    const termo = (inputSearchFiles?.value || '').trim().toLowerCase();

    // Alterna visibilidade do botão limpar busca
    if (btnClearSearch) {
      btnClearSearch.style.display = termo.length > 0 ? 'flex' : 'none';
    }

    if (!todosArquivosDoTorrent || todosArquivosDoTorrent.length === 0) {
      return;
    }

    // Filtra ignorando maiúsculas/minúsculas e buscando em qualquer parte do nome ou caminho
    const arquivosFiltrados = termo === ''
      ? todosArquivosDoTorrent
      : todosArquivosDoTorrent.filter((f) => {
          const nomeLower = (f.name || '').toLowerCase();
          const pathLower = (f.path || '').toLowerCase();
          return nomeLower.includes(termo) || pathLower.includes(termo);
        });

    renderizarTabelaArquivos(arquivosFiltrados, termo);
  }

  // Evento em tempo real: pesquisa instantânea enquanto digita
  inputSearchFiles?.addEventListener('input', filtrarArquivosInstantaneamente);

  // Limpar pesquisa
  btnClearSearch?.addEventListener('click', () => {
    inputSearchFiles.value = '';
    filtrarArquivosInstantaneamente();
    inputSearchFiles.focus();
  });

  // Atalho: tecla Escape limpa a pesquisa
  inputSearchFiles?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inputSearchFiles.value = '';
      filtrarArquivosInstantaneamente();
    }
  });

  // Renderiza as linhas da tabela de arquivos com alta performance
  function renderizarTabelaArquivos(arquivos, termoBusca = '') {
    const totalOriginal = todosArquivosDoTorrent.length;
    const totalFiltrado = arquivos.length;

    if (termoBusca !== '') {
      searchResultCount.textContent = `${totalFiltrado.toLocaleString('pt-BR')} de ${totalOriginal.toLocaleString('pt-BR')} arquivos`;
      filesCountText.textContent = `Exibindo ${totalFiltrado.toLocaleString('pt-BR')} arquivos correspondentes à busca "${termoBusca}"`;
    } else {
      searchResultCount.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos disponíveis`;
      filesCountText.textContent = `${totalOriginal.toLocaleString('pt-BR')} arquivos carregados`;
    }

    if (totalFiltrado === 0) {
      filesTableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">🔍</div>
              <h4>Nenhum arquivo encontrado</h4>
              <p>Nenhum arquivo corresponde ao termo <strong>"${termoBusca}"</strong>. Tente outro nome ou limpe a busca.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    arquivos.forEach((f, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'torrent-file-row';
      tr.dataset.index = f.index;

      const prioInfo = formatarPrioridade(f.priority);
      const percentualNum = typeof f.progress === 'number'
        ? (f.progress > 1 ? f.progress : f.progress * 100)
        : 0;
      const percentualStr = percentualNum.toFixed(1) + '%';
      const isComplete = percentualNum >= 100;

      const nomeArquivo = f.name || f.path.split('/').pop() || f.path;
      const caminhoArquivo = f.path || f.name;

      tr.innerHTML = `
        <td class="cell-file-index">${f.index !== undefined ? f.index : idx}</td>
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
    });

    filesTableBody.innerHTML = '';
    filesTableBody.appendChild(fragment);
  }

  // ==========================================
  // ETAPA 5: SELEÇÃO E VISUALIZAÇÃO DOS ARQUIVOS
  // ==========================================
  async function selecionarTorrent(torrent) {
    torrentSelecionadoAtual = torrent;

    // Destaca a linha selecionada na tabela de torrents
    document.querySelectorAll('.torrent-row').forEach((r) => {
      r.classList.toggle('selected', r.dataset.hash === torrent.hash);
    });

    // Exibe a seção de arquivos e reseta o input de pesquisa
    torrentFilesSection.style.display = 'flex';
    selectedTorrentName.textContent = torrent.name;
    selectedTorrentMeta.textContent = `Tamanho total: ${formatarTamanho(torrent.size)}`;
    
    if (inputSearchFiles) {
      inputSearchFiles.value = '';
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
        <td colspan="6">
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
        
        selectedTorrentMeta.textContent = `${todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos • ${formatarTamanho(torrent.size)} no total`;

        renderizarTabelaArquivos(todosArquivosDoTorrent, '');

        mostrarToast(
          'Arquivos Carregados',
          `${todosArquivosDoTorrent.length.toLocaleString('pt-BR')} arquivos carregados com sucesso de "${torrent.name}".`,
          'success'
        );
      } else {
        todosArquivosDoTorrent = [];
        filesCountText.textContent = 'Erro ao carregar arquivos';
        searchResultCount.textContent = '0 arquivos';
        filesTableBody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="6">
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>Falha ao carregar arquivos</h4>
                <p>${data.erro || 'Não foi possível carregar os arquivos deste torrent.'}</p>
              </div>
            </td>
          </tr>
        `;
        mostrarToast('Erro', data.erro || 'Falha ao carregar arquivos do torrent.', 'error');
      }
    } catch (err) {
      todosArquivosDoTorrent = [];
      filesCountText.textContent = 'Erro de comunicação';
      searchResultCount.textContent = 'Erro';
      filesTableBody.innerHTML = `
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
      mostrarToast('Erro de Rede', err.message, 'error');
    }
  }

  // Fechar visualização de arquivos
  btnFecharArquivos?.addEventListener('click', () => {
    torrentFilesSection.style.display = 'none';
    torrentSelecionadoAtual = null;
    todosArquivosDoTorrent = [];
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
          inputHttps.checked = Boolean(data.config.useHttps);

          if (data.config.hasPassword && !inputPassword.value) {
            inputPassword.placeholder = '•••••••• (senha salva)';
          }

          const proto = inputHttps.checked ? 'https' : 'http';
          infoEndpoint.textContent = `${proto}://${inputHost.value}:${inputPort.value}`;
        }

        const isConectado = data.statusConexao?.conectado;
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
        await carregarDados();
        await carregarTorrents();
      }
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    }
  });

  // Carregamento inicial da página
  await carregarDados();
  await carregarTorrents();
});
