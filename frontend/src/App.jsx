import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import { listDocuments } from './services/documentApi';

// Componente raiz do DMS: monta upload, listagem e download dos documentos.
export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1>Document Management System</h1>
      <UploadComponent onUploadSuccess={loadDocuments} />
      <section>
        <h2>Meus documentos</h2>
        <DocumentList
          documents={documents}
          loading={loading}
          error={error}
          onRetry={loadDocuments}
        />
      </section>
    </main>
  );
}
