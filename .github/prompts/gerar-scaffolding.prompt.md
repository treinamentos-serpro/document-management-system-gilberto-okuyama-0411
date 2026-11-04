---
description: Gera o scaffolding de um módulo do backend seguindo a arquitetura routes -> controllers -> services -> repositories.
name: gerar-scaffolding
argument-hint: nome do módulo (ex. documents)
agent: agent
---

# Gerar scaffolding do backend

Gere o scaffolding do módulo `${input:modulo:nome do módulo}` em `backend/src`, criando um arquivo por camada:

- `routes/${input:modulo}Routes.js`: registra os endpoints e delega para o controller.
- `controllers/${input:modulo}Controller.js`: trata entrada/saída HTTP e validação básica.
- `services/${input:modulo}Service.js`: concentra as regras de negócio.
- `repositories/${input:modulo}Repository.js`: cuida da persistência.

Requisitos:

- Use Node.js + Express com CommonJS (`require`/`module.exports`).
- Respeite o fluxo de dependência `routes -> controllers -> services -> repositories`; camadas internas não conhecem camadas externas e services/repositories não dependem de Express.
- Uploads de arquivo usam `multer` com `diskStorage`, gravando em `backend/storage`; metadados ficam em memória nesta fase.
- Configurações operacionais (porta, diretório de armazenamento, limites) vêm de variáveis de ambiente com valores padrão.
- Erros esperados retornam JSON no formato `{"error":{"code":"...","message":"..."}}`, sem expor stack traces ou caminhos físicos.
- Nomes de símbolos em inglês; mensagens ao usuário e comentários em português.
- Registre as novas rotas em `backend/src/app.js` sem quebrar funcionalidades existentes.
- Mantenha o código simples (KISS/YAGNI), sem abstrações desnecessárias.
