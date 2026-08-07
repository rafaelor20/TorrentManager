# TorrentManager

Aplicação para gerenciamento de clientes BitTorrent distribuída como um único executável/runtime integrado com interface web moderna e arquitetura modular.

---

## 🚀 Como Executar

### 1. Pré-requisitos
- Node.js (v20+ recomendado)
- npm

### 2. Instalar Dependências
```bash
npm install
```

### 3. Compilar o Projeto
```bash
npm run build
```

### 4. Iniciar a Aplicação
```bash
npm start
```
Ou em modo de desenvolvimento contínuo:
```bash
npm run dev
```

A interface estará disponível em [http://localhost:3000](http://localhost:3000).

---

## 📐 Arquitetura

O projeto foi desenhado de forma modular sem separação desnecessária de múltiplos repositórios:

```
TorrentManager/
├── public/                     # Interface Web (HTML5, Modern CSS, JS)
│   ├── index.html              # Interface exibindo status inicial
│   ├── styles.css              # Design com tema escuro e glassmorphism
│   └── app.js                  # Comunicação com a API local
├── src/
│   ├── domain/
│   │   ├── models/             # Entidades de domínio
│   │   │   ├── Torrent.ts
│   │   │   ├── TorrentFile.ts
│   │   │   └── TorrentClientConfig.ts
│   │   └── client/
│   │       └── TorrentClient.ts # Interface de abstração para clientes BitTorrent
│   ├── infra/
│   │   └── clients/
│   │       ├── QBittorrentClient.ts     # Implementação do qBittorrent
│   │       └── TorrentClientFactory.ts # Fábrica desacoplada para troca de clientes
│   ├── server/
│   │   ├── app.ts              # Servidor Express unificado
│   │   └── routes.ts           # Roteador da API REST
│   └── index.ts                # Ponto de entrada do executável
├── package.json
└── tsconfig.json
```

---

## 🔌 Camada de Abstração `TorrentClient`

A interface `TorrentClient` padroniza o contrato de comunicação:
- `conectar(config?: TorrentClientConfig): Promise<boolean>`
- `listarTorrents(): Promise<Torrent[]>`
- `listarArquivos(torrentHash: string): Promise<TorrentFile[]>`
- `alterarPrioridades(torrentHash: string, fileIndices: number[], priority: FilePriority): Promise<boolean>`
- `obterStatusConexao(): ConnectionStatus`

Para trocar de cliente (ex.: para Transmission, Deluge, etc. no futuro), basta criar uma nova classe que implemente `TorrentClient` e alterar a instância na inicialização.
