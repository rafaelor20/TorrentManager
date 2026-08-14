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

A interface estará disponível em [http://localhost:3000](http://localhost:3000) por padrão.

---

## ⚙️ Configuração de Portas e Variáveis (.env)

Por padrão, a aplicação inicia na porta **`3000`**. Você pode configurar outra porta e outros parâmetros facilmente criando um arquivo `.env` na mesma pasta do executável ou na raiz do projeto:

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Defina a porta desejada no arquivo `.env`:
   ```env
   # Porta do Servidor Web local
   PORT=8080

   # Endereço de escuta (opcional)
   HOST=0.0.0.0

   # Configurações opcionais do qBittorrent
   QBIT_HOST=localhost
   QBIT_PORT=8877
   QBIT_USER=admin
   QBIT_PASSWORD=Ozzy261220
   ```

A aplicação e o script `iniciar.bat` no pacote Windows (.exe) lerão automaticamente o arquivo `.env` e iniciarão o servidor na porta especificada!

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
