// Servidor backend do Document Management System.
//
// Camadas (Clean Architecture simples):
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.
// Os metadados ficam em memória: são perdidos ao reiniciar o processo.

const express = require('express');
const config = require('./config');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = config.port;

app.use(express.json());

// Endpoint de verificação de saúde (não depende de identidade).
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rotas de documentos: /upload, /documents e /documents/:id/download.
app.use(documentRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
