import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ApkMetadata {
  version: string;
  changelog: string;
  uploadedAt: string;
  filename: string;
  size: number;
  uploadedBy: string;
}

export function ApkUploader() {
  const { token } = useAuth();
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentApk, setCurrentApk] = useState<ApkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchCurrentApk();
  }, []);

  const fetchCurrentApk = async () => {
    try {
      const res = await fetch(`${API_URL}/download/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.exists && data.metadata) {
        setCurrentApk(data.metadata);
      }
    } catch (err) {
      console.error('Error fetching APK info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage({ type: 'error', text: 'Selecione um arquivo APK' });
      return;
    }
    
    if (!version.trim()) {
      setMessage({ type: 'error', text: 'Informe a versão' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage(null);

    const formData = new FormData();
    formData.append('apk', file);
    formData.append('version', version);
    formData.append('changelog', changelog);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setMessage({ type: 'success', text: `APK v${version} enviado com sucesso!` });
          setCurrentApk(data.metadata);
          setVersion('');
          setChangelog('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          const error = JSON.parse(xhr.responseText);
          setMessage({ type: 'error', text: error.error || 'Erro ao enviar APK' });
        }
        setUploading(false);
        setProgress(0);
      };

      xhr.onerror = () => {
        setMessage({ type: 'error', text: 'Erro de conexão' });
        setUploading(false);
        setProgress(0);
      };

      xhr.open('POST', `${API_URL}/download/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao enviar APK' });
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir o APK atual?')) return;

    try {
      const res = await fetch(`${API_URL}/download/current`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setCurrentApk(null);
        setMessage({ type: 'success', text: 'APK excluído' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir' });
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        📦 Gerenciar APK
      </h2>

      {/* Current APK Info */}
      {loading ? (
        <div className="text-zinc-400 mb-4">Carregando...</div>
      ) : currentApk ? (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-semibold">✅ APK Disponível</p>
              <p className="text-white">Versão: <span className="font-mono">{currentApk.version}</span></p>
              <p className="text-zinc-400 text-sm">
                {formatSize(currentApk.size)} • Enviado em {formatDate(currentApk.uploadedAt)}
              </p>
              {currentApk.changelog && (
                <p className="text-zinc-400 text-sm mt-1">📝 {currentApk.changelog}</p>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-1 border border-red-700 rounded"
            >
              Excluir
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-4 text-zinc-400">
          Nenhum APK disponível para download
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-zinc-300 text-sm mb-1">Arquivo APK</label>
          <input
            type="file"
            ref={fileInputRef}
            accept=".apk"
            disabled={uploading}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-emerald-600 file:text-white file:cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-300 text-sm mb-1">Versão *</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.28"
              disabled={uploading}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500"
            />
          </div>
          <div>
            <label className="block text-zinc-300 text-sm mb-1">Changelog</label>
            <input
              type="text"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Correções de bugs..."
              disabled={uploading}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500"
            />
          </div>
        </div>

        {uploading && (
          <div className="w-full bg-zinc-700 rounded-full h-3">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
            <p className="text-center text-zinc-300 text-sm mt-1">{progress}%</p>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {uploading ? 'Enviando...' : '📤 Enviar APK'}
        </button>
      </form>

      {/* Public Download Link */}
      {currentApk && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <p className="text-zinc-400 text-sm">Link público para download:</p>
          <code className="text-emerald-400 text-sm break-all">
            {window.location.origin}/download
          </code>
        </div>
      )}
    </div>
  );
}
