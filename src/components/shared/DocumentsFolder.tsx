'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Trash2, Loader2, FolderOpen } from 'lucide-react';

interface DocumentRecord {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  documentType: string;
  extractionData: Record<string, unknown> | null;
  uploadedAt: string;
  downloadUrl?: string;
}

interface DocumentsFolderProps {
  entityType: 'client' | 'partner';
  entityId: string;
  entityName: string;
}

export default function DocumentsFolder({ entityType, entityId, entityName }: DocumentsFolderProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents?entityType=${entityType}&entityId=${entityId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      console.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleDownload(docId: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.downloadUrl, '_blank');
      }
    } catch {
      console.error('Failed to get download URL');
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Delete this document permanently?')) return;
    setDeleting(docId);
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      console.error('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      padding: 16,
      border: '1px solid #e0dbd2',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FolderOpen size={16} style={{ color: '#00c853' }} />
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#1a1a1a',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Contracts & Documents
        </span>
        <span style={{
          fontSize: 10,
          color: '#999',
          fontFamily: "'DM Sans', sans-serif",
          marginLeft: 'auto',
        }}>
          {entityName}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', justifyContent: 'center' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: '#999' }} />
          <span style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>Loading documents...</span>
        </div>
      ) : documents.length === 0 ? (
        <div style={{
          padding: '24px 16px',
          textAlign: 'center',
          background: '#faf8f4',
          borderRadius: 8,
          border: '1px dashed #e0dbd2',
        }}>
          <FileText size={24} style={{ color: '#ccc', marginBottom: 6 }} />
          <p style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            No documents uploaded yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: '#faf8f4',
                border: '1px solid #e0dbd2',
                transition: 'background 0.15s',
              }}
            >
              <FileText size={16} style={{ color: '#666', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontFamily: "'DM Sans', sans-serif",
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {doc.fileName}
                </p>
                <p style={{
                  fontSize: 10,
                  color: '#999',
                  fontFamily: "'Space Mono', monospace",
                  margin: '2px 0 0 0',
                }}>
                  {formatSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}
                  {doc.documentType !== 'contract' && ` · ${doc.documentType}`}
                </p>
              </div>
              <button
                onClick={() => handleDownload(doc.id)}
                title="Download"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  color: '#00c853',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
                title="Delete"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: deleting === doc.id ? 'default' : 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  color: '#d32f2f',
                  opacity: deleting === doc.id ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
