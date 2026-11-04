// Erro de aplicação com código legível. Não depende de Express: a tradução
// do código para status HTTP é responsabilidade dos controllers.

class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

module.exports = { AppError };
