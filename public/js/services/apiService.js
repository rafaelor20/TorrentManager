/**
 * Backend API communication service
 */

export const apiService = {
  async getStatus() {
    try {
      const res = await fetch('/api/status');
      return res.json();
    } catch (err) {
      return { status: 'offline', mensagem: err.message, conectado: false };
    }
  },

  async getConfig() {
    try {
      const res = await fetch('/api/config');
      return res.json();
    } catch (err) {
      return { sucesso: false, erro: err.message };
    }
  },

  async saveConfig(payload) {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    } catch (err) {
      return { sucesso: false, erro: err.message };
    }
  },

  async connectClient(payload) {
    try {
      const res = await fetch('/api/client/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { sucesso: false, erro: err.message } };
    }
  },

  async disconnectClient() {
    try {
      const res = await fetch('/api/client/disconnect', {
        method: 'POST',
      });
      return res.json();
    } catch (err) {
      return { sucesso: false, erro: err.message };
    }
  },

  async getTorrents() {
    try {
      const res = await fetch('/api/torrents');
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { sucesso: false, erro: err.message, torrents: [] } };
    }
  },

  async getTorrentFiles(hash) {
    try {
      const res = await fetch(`/api/torrents/${encodeURIComponent(hash)}/files`);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { sucesso: false, erro: err.message, files: [] } };
    }
  },

  async getBatchTorrentFiles(hashes) {
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return { ok: true, status: 200, data: { sucesso: true, filesByHash: {} } };
    }

    const SUB_BATCH_SIZE = 8;
    if (hashes.length <= SUB_BATCH_SIZE) {
      try {
        const res = await fetch('/api/torrents/batch-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashes }),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        return { ok: false, status: 0, data: { sucesso: false, erro: err.message, filesByHash: {} } };
      }
    }

    // Partition into smaller sub-batches to prevent overwhelming memory or network buffers
    const subBatches = [];
    for (let i = 0; i < hashes.length; i += SUB_BATCH_SIZE) {
      subBatches.push(hashes.slice(i, i + SUB_BATCH_SIZE));
    }

    const mergedFilesByHash = {};
    let anyOk = false;
    const CONCURRENCY = 2;

    for (let i = 0; i < subBatches.length; i += CONCURRENCY) {
      const chunk = subBatches.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (batchHashes) => {
          try {
            const res = await fetch('/api/torrents/batch-files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hashes: batchHashes }),
            });
            const data = await res.json();
            if (res.ok && data?.sucesso && data?.filesByHash) {
              anyOk = true;
              Object.assign(mergedFilesByHash, data.filesByHash);
            }
          } catch (err) {
            console.warn('[apiService] Warning while fetching sub-batch of files:', err);
          }
        })
      );
    }

    return {
      ok: anyOk,
      status: anyOk ? 200 : 500,
      data: {
        sucesso: anyOk,
        filesByHash: mergedFilesByHash,
      },
    };
  },

  async applyPriority(hash, payload) {
    try {
      const res = await fetch(`/api/torrents/${encodeURIComponent(hash)}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { sucesso: false, erro: err.message } };
    }
  },

  async openFileFolder(hash, fileIndex) {
    try {
      const res = await fetch(`/api/torrents/${encodeURIComponent(hash)}/files/${fileIndex}/open-folder`, {
        method: 'POST',
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { sucesso: false, erro: err.message } };
    }
  },
};
