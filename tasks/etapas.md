Etapa 1 — Estrutura Inicial
Prompt

Crie a estrutura inicial de um projeto para uma aplicação desktop/web distribuída como um único executável.

Requisitos:

TypeScript
Arquitetura modular
Interface acessível pelo navegador (localhost) ou empacotável como desktop
Não separar o projeto em backend/frontend
Preparar a estrutura para futuras integrações com diferentes clientes BitTorrent através de uma interface TorrentClient
Criar apenas a estrutura inicial e um Hello World

Critérios de aceitação:

Projeto compila.
Executa com um único comando.
Interface abre no navegador exibindo "Aplicação iniciada".
Etapa 2 — Abstração dos Clientes BitTorrent
Prompt

Implemente uma camada de abstração para clientes BitTorrent.

Criar:

Interface TorrentClient
Implementação QBittorrentClient
Estrutura preparada para futuras implementações

A interface deverá possuir métodos como:

conectar()
listarTorrents()
listarArquivos()
alterarPrioridades()

Não implementar regras de negócio.

Critérios de aceitação:

Projeto compila.
Existe apenas uma implementação funcional (qBittorrent).
Trocar de implementação exige apenas alterar a instância criada.
Etapa 3 — Conexão com qBittorrent
Prompt

Implemente a comunicação com a Web API do qBittorrent.

Requisitos:

autenticação
tratamento de erros
configuração por arquivo ou interface
suporte a HTTP e HTTPS

Critérios de aceitação:

A aplicação conecta ao qBittorrent.
Exibe mensagem de sucesso.
Exibe erro amigável caso não consiga conectar.
Etapa 4 — Listagem de Torrents
Prompt

Utilizando a interface TorrentClient, implemente a listagem de torrents.

Exibir:

Nome
Status
Progresso
Tamanho

Atualização manual inicialmente.

Critérios de aceitação:

Todos os torrents do qBittorrent aparecem.
A lista atualiza corretamente.
Etapa 5 — Visualização dos Arquivos
Prompt

Permita selecionar um torrent.

Ao selecionar:

carregar todos os arquivos
exibir nome
caminho
tamanho
prioridade atual

Não implementar filtros ainda.

Critérios de aceitação:

Todos os arquivos aparecem corretamente.
Etapa 6 — Pesquisa
Prompt

Adicione uma pesquisa instantânea.

Requisitos:

pesquisar enquanto o usuário digita
ignorar maiúsculas/minúsculas
pesquisar em qualquer parte do nome

Critérios de aceitação:

A lista é filtrada imediatamente.
Não há necessidade de clicar em pesquisar.
Etapa 7 — Seleção
Prompt

Permita marcar e desmarcar arquivos.

Requisitos:

checkbox por arquivo
selecionar individualmente
manter estado da seleção
não aplicar alterações ao qBittorrent ainda

Critérios de aceitação:

A interface mantém corretamente o estado dos checkboxes.
Etapa 8 — Seleção em Massa
Prompt

Adicione operações em lote.

Botões:

Selecionar resultados
Desmarcar resultados
Inverter seleção dos resultados

As operações devem considerar apenas os arquivos visíveis após o filtro.

Critérios de aceitação:

Apenas os arquivos filtrados são afetados.
Etapa 9 — Aplicar Alterações
Prompt

Implemente a sincronização da seleção com o qBittorrent.

Ao clicar em "Aplicar":

enviar prioridades dos arquivos
atualizar interface
mostrar sucesso ou erro

Critérios de aceitação:

O qBittorrent altera corretamente os arquivos marcados para download.
Etapa 10 — Atualização Automática
Prompt

Atualize automaticamente a lista de torrents.

Requisitos:

detectar novos torrents
detectar torrents removidos
detectar alterações de status
não perder a seleção atual do usuário

Critérios de aceitação:

A interface permanece sincronizada com o qBittorrent.
Etapa 11 — Configurações
Prompt

Crie uma tela de configurações.

Configurações:

endereço do qBittorrent
porta
usuário
senha
intervalo de atualização

Persistir localmente.

Critérios de aceitação:

Configurações permanecem após reiniciar a aplicação.
Etapa 12 — Otimização
Prompt

Otimize a listagem de arquivos para torrents contendo dezenas de milhares de arquivos.

Requisitos:

virtualização da lista
pesquisa rápida
baixo consumo de memória

Critérios de aceitação:

Abrir um torrent com mais de 50.000 arquivos permanece responsivo.
A pesquisa continua instantânea.
Etapa 13 — Refatoração para Plugins
Prompt

Refatore o projeto para suportar múltiplos clientes BitTorrent.

Requisitos:

nenhuma regra de negócio deve depender diretamente do qBittorrent
criar uma camada de provedores
manter a implementação atual funcionando

Critérios de aceitação:

O projeto continua funcionando apenas com o qBittorrent.
Adicionar um novo cliente exige apenas criar uma nova implementação da interface TorrentClient.

Etapa 14 — Compilação para Windows (.exe)
Prompt

Implemente uma forma de compilar executável (.exe) standalone para Windows.

Requisitos:
- Gerar executável nativo Windows x64 (.exe) sem dependência de Node.js instalado na máquina do usuário final.
- Script automatizado de compilação npm run build:exe / npm run build:win.
- Empacotamento com esbuild e Node.js Single Executable Application (SEA) via postject.
- Pacote de distribuição completo e portátil na pasta release/ (TorrentManager.exe, iniciar.bat, public/, data/config.json, LEIAME.txt).
- Arquivo compactado release/TorrentManager-Windows-x64.zip pronto para download e extração.