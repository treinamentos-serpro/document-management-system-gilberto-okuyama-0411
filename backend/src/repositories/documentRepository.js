// Repositório de documentos: metadados em memória + arquivos no filesystem
// local. Os metadados são perdidos ao reiniciar o processo (comportamento
// esperado nesta fase). Detalhes de filesystem ficam encapsulados aqui.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const config = require('../config');

// Metadados em memória, indexados pelo id do documento.
const documents = new Map();

function ensureStorageDir() {
  fs.mkdirSync(config.storageDir, { recursive: true });
}

// Garante o diretório de armazenamento na inicialização do módulo.
ensureStorageDir();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) || null;
}

function findByOwner(owner) {
  return Array.from(documents.values()).filter((doc) => doc.owner === owner);
}

// Resolve o caminho físico de um arquivo a partir do nome gerado pela
// aplicação. Nunca expor este caminho em respostas da API.
function resolveFilePath(storageName) {
  return path.join(config.storageDir, path.basename(storageName));
}

// Remove um arquivo gravado (limpeza de uploads inválidos ou incompletos).
async function removeFile(storageName) {
  try {
    await fsp.unlink(resolveFilePath(storageName));
  } catch {
    // Falha na limpeza não deve mascarar o erro original.
  }
}

module.exports = {
  ensureStorageDir,
  save,
  findById,
  findByOwner,
  resolveFilePath,
  removeFile,
};
