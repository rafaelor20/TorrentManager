/**
 * Serviço de comunicação com as APIs do backend
 */

export const apiService = {
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  async getConfig() {
    const res = await fetch('/api/config');
    return res.json();
  },

  async saveConfig(payload) {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async connectClient(payload) {
    const res = await fetch('/api/client/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  },

  async disconnectClient() {
    const res = await fetch('/api/client/disconnect', {
      method: 'POST',
    });
    return res.json();
  },

  async getTorrents() {
    const res = await fetch('/api/torrents');
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  },

  async getTorrentFiles(hash) {
    const res = await fetch(`/api/torrents/${encodeURIComponent(hash)}/files`);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  },

  async applyPriority(hash, payload) {
    const res = await fetch(`/api/torrents/${encodeURIComponent(hash)}/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  },

  async openFileFolder(hash, fileIndex) {
    const res = await fetch(`/api/torrents/${encodeURIComponent(hash)}/files/${fileIndex}/open-folder`, {
      method: 'POST',
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  },
};
