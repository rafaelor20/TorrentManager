// Script de interface do TorrentManager
document.addEventListener('DOMContentLoaded', async () => {
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');
  const activeClientName = document.getElementById('activeClientName');
  const statClientName = document.getElementById('statClientName');
  const activeImplementation = document.getElementById('activeImplementation');
  const clientConnectionStatus = document.getElementById('clientConnectionStatus');
  const serverLocalUrl = document.getElementById('serverLocalUrl');
  const btnTestApi = document.getElementById('btnTestApi');
  const btnTestClient = document.getElementById('btnTestClient');
  const apiResponseBox = document.getElementById('apiResponseBox');
  const apiResponseTime = document.getElementById('apiResponseTime');
  const apiResponseCode = document.getElementById('apiResponseCode');

  serverLocalUrl.textContent = window.location.origin;

  // Carrega status da API
  async function carregarStatus() {
    const inicio = performance.now();
    try {
      const response = await fetch('/api/status');
      const tempo = Math.round(performance.now() - inicio);
      
      if (response.ok) {
        const data = await response.json();
        
        systemStatusBadge.className = 'badge status-pill active';
        systemStatusText.textContent = data.mensagem || 'Aplicação iniciada';
        
        if (data.clienteAtivo) {
          activeClientName.textContent = data.clienteAtivo;
          statClientName.textContent = data.clienteAtivo;
          activeImplementation.textContent = `${data.clienteAtivo}Client (Ativo)`;
        }

        if (data.statusConexao) {
          clientConnectionStatus.textContent = data.statusConexao.conectado
            ? `Conectado (${data.statusConexao.detalhes || 'Online'})`
            : `Aguardando conexão (${data.statusConexao.detalhes || 'Configuração padrão'})`;
        }

        return { data, tempo };
      }
    } catch (err) {
      systemStatusBadge.className = 'badge status-pill';
      systemStatusText.textContent = 'Erro ao contatar API';
      clientConnectionStatus.textContent = 'Servidor local inacessível';
      return { erro: err.message, tempo: Math.round(performance.now() - inicio) };
    }
  }

  // Ação: Testar API
  btnTestApi?.addEventListener('click', async () => {
    btnTestApi.disabled = true;
    btnTestApi.style.opacity = '0.6';
    
    const resultado = await carregarStatus();
    
    apiResponseBox.style.display = 'block';
    apiResponseTime.textContent = `${resultado.tempo}ms`;
    apiResponseCode.textContent = JSON.stringify(resultado.data || resultado.erro, null, 2);
    
    setTimeout(() => {
      btnTestApi.disabled = false;
      btnTestApi.style.opacity = '1';
    }, 400);
  });

  // Ação: Testar conexão com cliente BitTorrent
  btnTestClient?.addEventListener('click', async () => {
    btnTestClient.disabled = true;
    btnTestClient.style.opacity = '0.6';
    const inicio = performance.now();

    try {
      const response = await fetch('/api/client/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      const tempo = Math.round(performance.now() - inicio);

      apiResponseBox.style.display = 'block';
      apiResponseTime.textContent = `${tempo}ms`;
      apiResponseCode.textContent = JSON.stringify(data, null, 2);

      await carregarStatus();
    } catch (err) {
      apiResponseBox.style.display = 'block';
      apiResponseTime.textContent = `${Math.round(performance.now() - inicio)}ms`;
      apiResponseCode.textContent = JSON.stringify({ erro: err.message }, null, 2);
    } finally {
      setTimeout(() => {
        btnTestClient.disabled = false;
        btnTestClient.style.opacity = '1';
      }, 400);
    }
  });

  // Carregamento inicial
  await carregarStatus();
});
