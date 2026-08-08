// Frontend do TorrentManager — Etapa 3
document.addEventListener('DOMContentLoaded', async () => {
  // Elementos da interface
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');
  const activeClientName = document.getElementById('activeClientName');
  const statClientName = document.getElementById('statClientName');
  const statConnectionStatus = document.getElementById('statConnectionStatus');
  const statAppVersion = document.getElementById('statAppVersion');
  const statWebApiVersion = document.getElementById('statWebApiVersion');
  
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
  const infoCookieStatus = document.getElementById('infoCookieStatus');
  const btnTestarConexao = document.getElementById('btnTestarConexao');
  const btnDesconectar = document.getElementById('btnDesconectar');

  // Toasts
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastCloseBtn = document.getElementById('toastCloseBtn');

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

  // Atualiza banner de feedback visual
  function setFeedback(tipo, titulo, detalhe) {
    feedbackBanner.className = `feedback-banner ${tipo}`;
    feedbackTitle.textContent = titulo;
    feedbackDetail.textContent = detalhe;
    feedbackIcon.textContent = tipo === 'success' ? '✓' : tipo === 'error' ? '✕' : '⚡';
  }

  // Carrega configurações e status atual
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

        // Preenche campos do formulário com as configurações persistidas
        if (data.config) {
          if (!inputHost.value) inputHost.value = data.config.host || '127.0.0.1';
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
          statAppVersion.textContent = data.infoCliente?.appVersion || 'Ativo';
          statWebApiVersion.textContent = data.infoCliente?.webApiVersion || 'v2.x';
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
      host: inputHost.value.trim() || '127.0.0.1',
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
        host: inputHost.value.trim() || '127.0.0.1',
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
        await carregarDados();
      }
    } catch (err) {
      mostrarToast('Erro', err.message, 'error');
    }
  });

  // Atualização inicial
  await carregarDados();
});
