// Regras de negócio dos documentos: registro de uploads, listagem por dono e
// verificação de propriedade no download. Não depende de Express.

const crypto = require('node:crypto');
const repository = require('../repositories/documentRepository');
const { AppError } = require('./errors');

// Remove campos internos (nome físico) antes de expor os metadados.
function toPublicMetadata(document) {
  const { storageName, ...publicMetadata } = document;
  return publicMetadata;
}

// Valida o conteúdo do arquivo já gravado pelo multer.
function assertValidFile(file) {
  if (!file.size) {
    throw new AppError('INVALID_FILE', 'O arquivo enviado está vazio.');
  }
}

// Monta os metadados do documento a partir do arquivo recebido e do dono.
function buildDocument({ owner, file }) {
  return {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };
}

// Busca um documento garantindo que pertence ao dono informado.
// Documento inexistente e documento de terceiro retornam o mesmo erro para
// evitar enumeração de documentos alheios.
function findOwnedDocument(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) {
    throw new AppError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }
  return document;
}

// Ordena por data de envio decrescente (mais recentes primeiro).
function byNewestFirst(a, b) {
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

async function registerUpload({ owner, file }) {
  if (!file) {
    throw new AppError('FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  try {
    assertValidFile(file);
    const document = buildDocument({ owner, file });
    repository.save(document);
    return toPublicMetadata(document);
  } catch (err) {
    // Falha após a gravação física: remove o arquivo para não deixar órfão.
    await repository.removeFile(file.filename);
    throw err;
  }
}

function listByOwner(owner) {
  return repository.findByOwner(owner).map(toPublicMetadata).sort(byNewestFirst);
}

function getDocumentForDownload(id, owner) {
  const document = findOwnedDocument(id, owner);

  return {
    document: toPublicMetadata(document),
    filePath: repository.resolveFilePath(document.storageName),
  };
}

module.exports = {
  registerUpload,
  listByOwner,
  getDocumentForDownload,
};
