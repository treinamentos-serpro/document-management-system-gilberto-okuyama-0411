// Configuração operacional via variáveis de ambiente (12-Factor App).
// Valores padrão documentados:
//   PORT                -> porta HTTP (padrão: 3000)
//   STORAGE_DIR         -> diretório dos arquivos (padrão: backend/storage)
//   MAX_FILE_SIZE_BYTES -> tamanho máximo do upload (padrão: 10 MiB)
//   DEFAULT_USER_ID     -> identidade padrão de desenvolvimento (padrão: demo-user)

const path = require('path');

const config = {
  port: Number(process.env.PORT) || 3000,
  storageDir: path.resolve(
    process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage')
  ),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024,
  defaultUserId: process.env.DEFAULT_USER_ID || 'demo-user',
};

module.exports = config;
