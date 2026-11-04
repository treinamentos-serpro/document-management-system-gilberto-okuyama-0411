// Rotas do DMS: registram endpoints e conectam middlewares aos controllers.
// Regras de negócio ficam nos services; filesystem fica no repositório e no
// multer (diskStorage) configurado aqui como middleware de transporte.

const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const documentController = require('../controllers/documentController');

const router = express.Router();

// Identidade do usuário resolvida em contexto confiável do servidor.
// Em desenvolvimento usa o header `x-user-id` ou o usuário padrão configurado.
// Não é autenticação: o seed não oferece controle de acesso para produção.
function resolveUser(req, res, next) {
  const userId = req.get('x-user-id') || config.defaultUserId;
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'USER_REQUIRED',
        message: 'Usuário não identificado na requisição.',
      },
    });
  }
  req.userId = userId;
  next();
}

// Gravação local com diskStorage. O nome físico é gerado pela aplicação
// (UUID), nunca derivado do nome enviado, evitando sobrescritas e traversal.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.storageDir),
  filename: (req, file, cb) => cb(null, crypto.randomUUID()),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeBytes, files: 1 },
});

router.post('/upload', resolveUser, upload.single('file'), documentController.upload);
router.get('/documents', resolveUser, documentController.list);
router.get('/documents/:id/download', resolveUser, documentController.download);

// Traduz erros do multer (limites de upload) para o formato padrão de erro.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'O arquivo excede o tamanho máximo permitido.',
        },
      });
    }
    return res.status(400).json({
      error: {
        code: 'INVALID_FILE',
        message: 'O arquivo enviado é inválido.',
      },
    });
  }
  next(err);
});

module.exports = router;
