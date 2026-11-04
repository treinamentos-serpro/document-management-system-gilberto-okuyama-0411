# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem seus documentos, mantendo os arquivos no filesystem local da aplicação e os metadados em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Receber um arquivo por solicitação e gravá-lo localmente com `multer` e `diskStorage`.
- Registrar em memória os metadados necessários para identificar o documento e seu proprietário.
- Listar os documentos pertencentes ao usuário da solicitação.
- Permitir o download de um documento somente quando ele pertencer ao usuário da solicitação.
- Disponibilizar uma interface web para upload, listagem e download.
- Configurar porta, diretório de armazenamento e limites operacionais por variáveis de ambiente.

### Fora do escopo

- Persistência durável dos metadados ou recuperação dos metadados após reiniciar o processo.
- Armazenamento em nuvem, banco de dados ou provedores externos.
- Versionamento, edição, compartilhamento, exclusão e busca avançada de documentos.
- Autenticação, cadastro de contas e recuperação de senha.
- Pré-visualização, conversão ou análise do conteúdo dos arquivos.

### Premissas e decisões pendentes

- Cada solicitação deve ter um identificador de usuário confiável, disponibilizado em contexto do servidor. O mecanismo que estabelece essa identidade (por exemplo, middleware de autenticação ou contexto de desenvolvimento) deve ser definido antes da implementação. Não aceitar um identificador arbitrário do corpo do upload como prova de identidade.
- A identidade por si só não autentica o solicitante. Sem autenticação, o MVP não deve ser apresentado como controle de acesso seguro para produção.
- Definir antes da implementação o valor padrão do limite máximo de upload e os tipos de conteúdo aceitos. Até essa decisão, o limite deve ser configurável e nenhum formato adicional deve ser presumido pelo cliente.
- A pasta padrão de armazenamento é `backend/storage`; o diretório efetivo deve poder ser configurado por ambiente e criado ou validado durante a inicialização.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | Uma solicitação multipart válida contendo um arquivo cria um identificador único, grava o conteúdo localmente e retorna os metadados públicos do documento. |
| RF-02 | O sistema valida o upload. | Solicitação sem arquivo, acima do limite configurado ou sem usuário resolvido é rejeitada com erro HTTP apropriado; uma falha não deixa um arquivo parcial registrado como documento válido. |
| RF-03 | O usuário pode listar seus documentos. | A listagem retorna somente documentos associados ao usuário da solicitação, sem expor caminhos internos; lista vazia retorna `200` com `[]`. |
| RF-04 | O usuário pode baixar um documento pelo identificador. | O conteúdo é enviado como arquivo para documentos existentes pertencentes ao usuário da solicitação. |
| RF-05 | O sistema protege o isolamento entre usuários. | Documento inexistente ou pertencente a outro usuário não tem conteúdo revelado; ambos retornam `404` para evitar enumeração de documentos alheios. |
| RF-06 | O sistema informa erros de forma consistente. | Erros esperados retornam JSON com código legível e mensagem; detalhes internos, stack traces e caminhos físicos não são expostos. |
| RF-07 | O sistema verifica sua disponibilidade. | `GET /health` retorna `200` e `{"status":"ok"}` quando o processo está disponível. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local usando `multer` com `diskStorage`; não usar armazenamento externo. |
| RNF-02 | Os metadados são mantidos em memória nesta fase; sua perda após reinício do processo é comportamento esperado e deve ser documentado. |
| RNF-03 | Configurações operacionais, incluindo porta, diretório de armazenamento e tamanho máximo do arquivo, são obtidas por variáveis de ambiente com valores padrão documentados. |
| RNF-04 | O backend segue a arquitetura simples `routes -> controllers -> services -> repositories`; regras de negócio não ficam nas rotas e camadas internas não dependem de Express. |
| RNF-05 | O frontend usa React e acessa o backend por `fetch` sob o prefixo `/api`, usando o proxy do Vite em desenvolvimento. |
| RNF-06 | Upload e download preservam o conteúdo binário sem conversão ou reserialização. |
| RNF-07 | O nome físico gravado é gerado pela aplicação e não derivado diretamente do nome enviado; isso evita sobrescritas e reduz riscos de traversal. |
| RNF-08 | A API não expõe o caminho físico do arquivo nem confia em caminhos fornecidos pelo cliente. |
| RNF-09 | Os fluxos principais e as falhas de validação são cobertos por testes automatizados, priorizando o runner nativo `node:test` no backend. |

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string (UUID) | Sim | Identificador único e opaco do documento. |
| `originalName` | string | Sim | Nome original fornecido no upload, retornado apenas como metadado seguro. |
| `size` | number | Sim | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string (ISO 8601 UTC) | Sim | Data e hora em que o upload foi concluído. |
| `owner` | string | Sim | Identificador do usuário resolvido no contexto da solicitação. |

### Dados internos de persistência

O repositório mantém, além dos metadados públicos, um nome físico gerado pela aplicação (por exemplo, `storageName`) necessário para localizar o arquivo. Esse valor e qualquer caminho absoluto ou relativo são internos: nunca devem ser serializados nas respostas da API. O repositório associa o registro em memória ao arquivo sob o diretório configurado.

## 6. Contratos de API

### Convenções

- Prefixo do backend: `/api` quando acessado pelo frontend. As rotas internas correspondem a `/upload`, `/documents` e `/documents/:id/download`.
- As respostas de sucesso de metadados usam `application/json; charset=utf-8`.
- A identidade deve estar disponível no contexto confiável da requisição; a definição do mecanismo é pré-requisito de implementação e não faz parte deste contrato de transporte.
- Erros usam o formato `{"error":{"code":"...","message":"..."}}`. Mensagens são estáveis e não incluem stack trace nem informação de filesystem.

### `POST /api/upload`

Envia um arquivo.

- Entrada: `multipart/form-data` com campo de arquivo `file`; exatamente um arquivo por requisição.
- Requisitos: usuário resolvido no contexto; arquivo não vazio; tamanho dentro do limite configurado.
- Sucesso: `201 Created` com metadados públicos.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-11-04T12:00:00.000Z",
  "owner": "user-123"
}
```

- Erros: `400 Bad Request` (`FILE_REQUIRED`, `INVALID_FILE`), `413 Payload Too Large` (`FILE_TOO_LARGE`), `500 Internal Server Error` (`UPLOAD_FAILED`). Se o registro falhar após a gravação, o arquivo recém-gravado deve ser removido quando possível.

### `GET /api/documents`

Lista os documentos do usuário atual.

- Entrada: sem corpo; identidade obtida do contexto confiável da requisição.
- Sucesso: `200 OK`, array de metadados públicos, ordenado por `uploadedAt` decrescente. Nenhum resultado retorna `[]`.
- Erros: `401 Unauthorized` (`USER_REQUIRED`) quando não houver identidade resolvida; `500 Internal Server Error` (`LIST_FAILED`).

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-11-04T12:00:00.000Z",
    "owner": "user-123"
  }
]
```

### `GET /api/documents/:id/download`

Baixa o conteúdo de um documento pertencente ao usuário atual.

- Entrada: identificador do documento no parâmetro `id`; sem corpo.
- Sucesso: `200 OK`, corpo binário original e cabeçalho `Content-Disposition: attachment` com o nome original tratado com segurança.
- Erros: `400 Bad Request` (`INVALID_DOCUMENT_ID`) para identificador malformado; `404 Not Found` (`DOCUMENT_NOT_FOUND`) para documento inexistente ou não pertencente ao usuário; `500 Internal Server Error` (`DOWNLOAD_FAILED`) para falha de leitura. Nunca aceitar caminho de arquivo como parâmetro.

### `GET /api/health`

- Sucesso: `200 OK` com `{"status":"ok"}`.

### Regras de status

- Respostas de erro não incluem metadados de outro usuário.
- Respostas `404` de download são indistinguíveis para documento inexistente e documento de terceiro.
- Se o contexto de identidade não estiver disponível, endpoints de upload, listagem e download respondem `401`; o endpoint de saúde não depende de identidade.

## 7. Decisões arquiteturais

- Backend em Node.js, Express e CommonJS.
- `routes/`: registra endpoints e conecta middlewares/controllers.
- `controllers/`: interpreta a entrada HTTP, valida parâmetros de transporte e traduz resultados para status e respostas HTTP.
- `services/`: implementa regras de negócio, como associar documentos ao usuário e impedir download por outro proprietário.
- `repositories/`: grava e lê arquivos com `multer`/`diskStorage` e mantém os metadados em memória. O repositório encapsula detalhes de filesystem.
- As rotas e controllers não acessam filesystem nem armazenam regras de negócio. Serviços não dependem de Express.
- Arquivos ficam em diretório local configurável, com nome físico gerado pela aplicação. Metadados contêm nome original, mas não caminho físico.
- Frontend em React + Vite, organizado em `components/`, `pages/` e `services/`; chamadas HTTP ficam no serviço frontend e usam `/api`.
- O frontend apresenta estados de carregamento, lista vazia, sucesso e erro para upload/listagem/download; não tenta inferir que o arquivo continuará disponível depois de reinício do backend.
- A ausência de persistência de metadados implica que arquivos órfãos podem existir após reinício. Limpeza automática ou recuperação não fazem parte deste escopo.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Esta especificação não executa nem altera arquivos de backend ou frontend.

1. Revisar e aprovar esta especificação; decidir como o contexto confiável do usuário será fornecido, o limite padrão de upload e a política de tipos de arquivo.
2. Definir os contratos internos entre controllers, services e repositories e os formatos comuns de erro, sem acoplar regras de negócio ao Express.
3. Implementar e testar o repositório de arquivos locais e metadados em memória, incluindo nomes físicos gerados, tratamento de falhas e limpeza de gravações incompletas.
4. Implementar e testar os serviços de upload, listagem por proprietário e download com verificação de propriedade.
5. Implementar controllers, rotas, configuração por ambiente e integração do middleware de identidade; validar códigos HTTP e o endpoint de saúde.
6. Implementar no frontend as telas e estados de upload, listagem e download, consumindo a API via `/api`.
7. Executar testes automatizados do backend e verificações de build do frontend; validar os fluxos ponta a ponta e documentar configurações, limitações de persistência e procedimento de execução.
