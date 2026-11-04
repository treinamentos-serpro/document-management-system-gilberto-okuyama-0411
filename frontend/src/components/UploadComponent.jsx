import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi';

// Formulário de upload de documento. Notifica o componente pai via
// onUploadSuccess para que a listagem seja atualizada.
export default function UploadComponent({ onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0] ?? null);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
      setError('Selecione um arquivo antes de enviar.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const uploaded = await uploadDocument(selectedFile);
      setSuccessMessage(`Documento "${uploaded.originalName}" enviado com sucesso.`);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess?.(uploaded);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      <h2>Enviar documento</h2>
      <form onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" disabled={uploading || !selectedFile}>
          {uploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
    </section>
  );
}
