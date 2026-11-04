import { useState } from 'react';
import { downloadDocument } from '../services/documentApi';

// Botão de download de um documento. Mostra estado de progresso e erro.
export default function DownloadButton({ documentId, originalName }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadDocument(documentId, originalName);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span role="alert" style={{ color: 'crimson', marginLeft: '0.5rem' }}>{error}</span>}
    </span>
  );
}
