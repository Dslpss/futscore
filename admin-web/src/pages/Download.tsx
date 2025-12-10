import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ApkInfo {
  available: boolean;
  version?: string;
  changelog?: string;
  uploadedAt?: string;
  size?: number;
  downloadUrl?: string;
  message?: string;
}

export function Download() {
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchApkInfo();
  }, []);

  const fetchApkInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/download/info`);
      const data = await res.json();
      setApkInfo(data);
    } catch (err) {
      console.error('Error fetching APK info:', err);
      setApkInfo({ available: false, message: 'Erro ao carregar informações' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    window.location.href = `${API_URL}/download/apk`;
    setTimeout(() => setDownloading(false), 3000);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <span className="text-5xl">⚽</span>
          </div>
          <h1 className="text-3xl font-bold text-white">FutScore</h1>
          <p className="text-zinc-400 mt-2">Acompanhe seus times favoritos</p>
        </div>

        {/* Download Card */}
        <div className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-xl">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-zinc-400 mt-3">Carregando...</p>
            </div>
          ) : apkInfo?.available ? (
            <>
              {/* Version Info */}
              <div className="text-center mb-6">
                <div className="inline-block bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full text-sm font-medium mb-2">
                  Versão {apkInfo.version}
                </div>
                <p className="text-zinc-500 text-sm">
                  {formatSize(apkInfo.size)} • Atualizado em {formatDate(apkInfo.uploadedAt)}
                </p>
              </div>

              {/* Changelog */}
              {apkInfo.changelog && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-6">
                  <p className="text-zinc-300 text-sm">📝 {apkInfo.changelog}</p>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/30"
              >
                {downloading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Baixando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    📥 Baixar APK
                  </span>
                )}
              </button>

              {/* Install Instructions */}
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h3 className="text-white font-semibold mb-3">📱 Como instalar:</h3>
                <ol className="text-zinc-400 text-sm space-y-2">
                  <li className="flex gap-2">
                    <span className="text-emerald-400">1.</span>
                    Baixe o arquivo APK
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">2.</span>
                    Abra o arquivo no seu Android
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">3.</span>
                    Permita instalação de fontes desconhecidas
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">4.</span>
                    Toque em "Instalar" e pronto!
                  </li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl">📭</span>
              <h3 className="text-white font-semibold mt-4">Nenhum APK disponível</h3>
              <p className="text-zinc-400 mt-2 text-sm">Volte em breve para baixar o app</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link 
            to="/login" 
            className="text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
          >
            Área administrativa →
          </Link>
        </div>
      </div>
    </div>
  );
}
