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

async function registerUpload({ owner, file }) {
  if (!file) {
    throw new AppError('FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  if (!file.size) {
    // Arquivo vazio: remove a gravação para não registrar documento inválido.
    await repository.removeFile(file.filename);
    throw new AppError('INVALID_FILE', 'O arquivo enviado está vazio.');
  }

  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };

  try {
    repository.save(document);
  } catch (err) {
    // Registro falhou após a gravação: remove o arquivo recém-gravado.
    await repository.removeFile(file.filename);
    throw err;
  }

  return toPublicMetadata(document);
}

function listByOwner(owner) {
  return repository
    .findByOwner(owner)
    .map(toPublicMetadata)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

function getDocumentForDownload(id, owner) {
  const document = repository.findById(id);

  // Documento inexistente e documento de terceiro retornam o mesmo erro para
  // evitar enumeração de documentos alheios.
  if (!document || document.owner !== owner) {
    throw new AppError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

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
