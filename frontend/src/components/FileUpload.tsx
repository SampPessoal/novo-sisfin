import { useState, useRef, type DragEvent } from 'react';
import { Card } from 'react-bootstrap';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function FileUpload({ onFileSelect, accept, label, maxSizeMB = 10 }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      alert(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return;
    }
    setFileName(file.name);
    onFileSelect(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <Card
      className={`text-center p-4 border-2 border-dashed ${dragOver ? 'border-primary bg-light' : 'border-secondary'}`}
      style={{ cursor: 'pointer' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="d-none"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {fileName ? (
        <div>
          <strong>{fileName}</strong>
          <br />
          <small className="text-muted">Clique para trocar</small>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '2rem' }}>📁</div>
          <p className="mb-1">{label || 'Arraste um arquivo ou clique para selecionar'}</p>
          <small className="text-muted">Máx: {maxSizeMB}MB</small>
        </div>
      )}
    </Card>
  );
}
