// Cliente de API do DMS. Centraliza toda a comunicação HTTP com o backend
// via fetch, usando o prefixo /api (proxy configurado no Vite).

const API_PREFIX = '/api';

// Extrai a mensagem de erro padrão ({ error: { code, message } }) da resposta.
async function extractErrorMessage(response) {
  try {
    const body = await response.json();
    if (body?.error?.message) {
      return body.error.message;
    }
  } catch {
    // Corpo não é JSON; usa mensagem genérica abaixo.
  }
  return `Falha na requisição (HTTP ${response.status}).`;
}

async function ensureOk(response) {
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return response;
}

// Envia um documento e retorna seus metadados públicos.
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await ensureOk(
    await fetch(`${API_PREFIX}/upload`, { method: 'POST', body: formData })
  );
  return response.json();
}

// Lista os documentos do usuário atual.
export async function listDocuments() {
  const response = await ensureOk(await fetch(`${API_PREFIX}/documents`));
  return response.json();
}

// Baixa o conteúdo de um documento e dispara o download no navegador.
export async function downloadDocument(id, originalName) {
  const response = await ensureOk(
    await fetch(`${API_PREFIX}/documents/${encodeURIComponent(id)}/download`)
  );
  const blob = await response.blob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = originalName || 'documento';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
