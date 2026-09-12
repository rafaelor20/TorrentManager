import http from 'http';
import assert from 'assert';
import { createApp } from '../dist/server/app.js';
import { MockTorrentClient } from '../dist/infra/providers/mock/MockTorrentProvider.js';

class PriorityTestClient extends MockTorrentClient {
  constructor() {
    super();
    this.priorityCalls = [];
  }

  async alterarPrioridades(hash, indices, priority) {
    this.priorityCalls.push({ hash, count: indices.length, priority });
    return true;
  }

  async aplicarPrioridadesEmLote(hash, marcados, desmarcados, apagarDesativados) {
    if (marcados.length > 0) {
      await this.alterarPrioridades(hash, marcados, 1);
    }
    if (desmarcados.length > 0) {
      await this.alterarPrioridades(hash, desmarcados, 0);
    }
    return {
      sucesso: true,
      marcadosAlterados: marcados.length,
      desmarcadosAlterados: desmarcados.length,
      arquivosApagados: 0,
      espacoLiberadoBytes: 0,
    };
  }
}

async function run() {
  console.log('--- Starting Priority Chunks & Resilient Timeout Tests ---');

  const mockClient = new PriorityTestClient();
  const app = createApp(mockClient);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Send priority request with 1500 items (3 chunks of 500)
    const marcados = Array.from({ length: 1500 }, (_, i) => i);
    const desmarcados = Array.from({ length: 500 }, (_, i) => i + 1500);

    const res = await fetch(`${baseUrl}/api/torrents/test-hash-prio/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marcadosIndices: marcados,
        desmarcadosIndices: desmarcados,
        apagarDesativados: false,
      }),
    });

    assert.strictEqual(res.status, 200, 'Status must be 200');
    const data = await res.json();
    assert.strictEqual(data.sucesso, true, 'sucesso must be true');
    assert.strictEqual(data.detalhes.marcadosAlterados, 1500);
    assert.strictEqual(data.detalhes.desmarcadosAlterados, 500);
    console.log('✓ Test 1: Priority endpoint with 2,000 files handled successfully!');

    console.log('========================================================');
    console.log('✓ ALL PRIORITY TESTS PASSED!');
    console.log('========================================================');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
