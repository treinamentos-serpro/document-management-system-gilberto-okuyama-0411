// Controllers: interpretam a entrada HTTP, validam parâmetros de transporte e
// traduzem resultados e erros de negócio para status e respostas HTTP.

const documentService = require('../services/documentService');
const { AppError } = require('../services/errors');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_BY_CODE = {
  FILE_REQUIRED: 400,
  INVALID_FILE: 400,
  INVALID_DOCUMENT_ID: 400,
  USER_REQUIRED: 401,
  DOCUMENT_NOT_FOUND: 404,
  FILE_TOO_LARGE: 413,
};

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

// Erros esperados usam o código da AppError; erros inesperados usam o código
// de fallback do endpoint, sem expor detalhes internos.
function handleError(res, err, fallbackCode, fallbackMessage) {
  if (err instanceof AppError) {
    const status = STATUS_BY_CODE[err.code] || 500;
    return sendError(res, status, err.code, err.message);
  }
  sendError(res, 500, fallbackCode, fallbackMessage);
}

async function upload(req, res) {
  try {
    const document = await documentService.registerUpload({
      owner: req.userId,
      file: req.file,
    });
    res.status(201).json(document);
  } catch (err) {
    handleError(res, err, 'UPLOAD_FAILED', 'Não foi possível concluir o upload.');
  }
}

async function list(req, res) {
  try {
    res.json(documentService.listByOwner(req.userId));
  } catch (err) {
    handleError(res, err, 'LIST_FAILED', 'Não foi possível listar os documentos.');
  }
}

async function download(req, res) {
  const { id } = req.params;

  if (!UUID_PATTERN.test(id)) {
    return sendError(
      res,
      400,
      'INVALID_DOCUMENT_ID',
      'Identificador de documento inválido.'
    );
  }

  try {
    const { document, filePath } = documentService.getDocumentForDownload(
      id,
      req.userId
    );
    res.download(filePath, document.originalName, (err) => {
      if (err && !res.headersSent) {
        sendError(res, 500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
      }
    });
  } catch (err) {
    handleError(res, err, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
  }
}

module.exports = { upload, list, download };
