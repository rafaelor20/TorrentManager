import http from 'http';
import assert from 'assert';
import { createApp } from '../dist/server/app.js';
import { MockTorrentClient } from '../dist/infra/providers/mock/MockTorrentProvider.js';

// Custom mock client that generates 50,000 files
class LargeMockClient extends MockTorrentClient {
  constructor(fileCount = 50000) {
    super();
    this.fileCount = fileCount;
    this.largeFiles = [];
    for (let i = 0; i < fileCount; i++) {
      this.largeFiles.push({
        index: i,
        name: `game_data_chunk_${i}.dat`,
        path: `PS3_GAME/USRDIR/content/models/lod_${i % 5}`,
        size: 1024 * 1024 + (i % 1000),
        progress: (i % 2 === 0) ? 1 : 0.5,
        priority: 1,
        isAvailable: true,
      });
    }
  }

  async listarArquivos(hash) {
    return this.largeFiles;
  }

  async listarArquivosEmLote(hashes) {
    const res = {};
    for (const h of hashes) {
      res[h] = this.largeFiles;
    }
    return res;
  }
}

async function run() {
  console.log('--- Starting Large Torrent Files & Batch Streaming Tests ---');

  const FILE_COUNT = 50000;
  const mockClient = new LargeMockClient(FILE_COUNT);
  const app = createApp(mockClient);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`✓ Test server running on ${baseUrl} with ${FILE_COUNT} simulated files per torrent`);

  try {
    // 1. Test /api/torrents/:hash/files with 50,000 files
    console.log('Testing /api/torrents/:hash/files streaming...');
    const t0 = Date.now();
    const resSingle = await fetch(`${baseUrl}/api/torrents/mock-hash-1/files`);
    assert.strictEqual(resSingle.status, 200, 'Status must be 200');
    assert.strictEqual(resSingle.headers.get('content-type'), 'application/json; charset=utf-8');

    const dataSingle = await resSingle.json();
    const durationSingle = Date.now() - t0;
    assert.strictEqual(dataSingle.sucesso, true, 'sucesso must be true');
    assert.strictEqual(dataSingle.quantidade, FILE_COUNT, `quantidade must be ${FILE_COUNT}`);
    assert.strictEqual(dataSingle.files.length, FILE_COUNT, `files.length must be ${FILE_COUNT}`);
    assert.strictEqual(dataSingle.files[0].name, 'game_data_chunk_0.dat');
    assert.strictEqual(dataSingle.files[FILE_COUNT - 1].name, `game_data_chunk_${FILE_COUNT - 1}.dat`);
    console.log(`✓ Test 1: Single torrent files (50,000 files) streamed and parsed successfully in ${durationSingle}ms!`);

    // 2. Test /api/torrents/batch-files with multiple torrents (e.g. 3 torrents = 150,000 files total)
    console.log('Testing /api/torrents/batch-files streaming with 3 torrents (150,000 files total)...');
    const t1 = Date.now();
    const resBatch = await fetch(`${baseUrl}/api/torrents/batch-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: ['hash-a', 'hash-b', 'hash-c'] }),
    });
    assert.strictEqual(resBatch.status, 200, 'Batch status must be 200');
    const dataBatch = await resBatch.json();
    const durationBatch = Date.now() - t1;

    assert.strictEqual(dataBatch.sucesso, true, 'Batch sucesso must be true');
    assert.ok(dataBatch.filesByHash, 'filesByHash must exist');
    assert.strictEqual(Object.keys(dataBatch.filesByHash).length, 3, 'Must have 3 hashes');
    assert.strictEqual(dataBatch.filesByHash['hash-a'].length, FILE_COUNT);
    assert.strictEqual(dataBatch.filesByHash['hash-b'].length, FILE_COUNT);
    assert.strictEqual(dataBatch.filesByHash['hash-c'].length, FILE_COUNT);
    console.log(`✓ Test 2: Batch torrent files (150,000 files across 3 torrents) streamed and parsed successfully in ${durationBatch}ms!`);

    // 3. Test empty batch
    const resEmpty = await fetch(`${baseUrl}/api/torrents/batch-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: [] }),
    });
    const dataEmpty = await resEmpty.json();
    assert.strictEqual(dataEmpty.sucesso, true);
    assert.deepStrictEqual(dataEmpty.filesByHash, {});
    console.log('✓ Test 3: Empty batch handled correctly!');

    console.log('========================================================');
    console.log('✓ ALL LARGE FILES & BATCH STREAMING TESTS PASSED!');
    console.log('========================================================');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
