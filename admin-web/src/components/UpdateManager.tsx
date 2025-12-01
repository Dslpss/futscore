import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Smartphone } from 'lucide-react';

interface AppVersion {
  version: string;
  downloadLink: string;
  forceUpdate: boolean;
  active: boolean;
  notes: string;
}

export const UpdateManager = () => {
  const [version, setVersion] = useState('');
  const [downloadLink, setDownloadLink] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchVersion();
  }, []);

  const fetchVersion = async () => {
    try {
      const response = await axios.get<AppVersion>('/admin/version');
      const data = response.data;
      if (data) {
        setVersion(data.version);
        setDownloadLink(data.downloadLink);
        setForceUpdate(data.forceUpdate);
        setActive(data.active ?? true);
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching version', error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await axios.post('/admin/version', {
        version,
        downloadLink,
        forceUpdate,
        active,
        notes
      });
      setMessage('Versão atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating version', error);
      setMessage('Erro ao atualizar versão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
          <Smartphone size={24} />
        </div>
        <h3 className="text-lg font-semibold text-white">Versão do App</h3>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Versão (ex: 1.0.1)</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-green-500 focus:outline-none"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Link de Download</label>
            <input
              type="url"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-green-500 focus:outline-none"
              value={downloadLink}
              onChange={(e) => setDownloadLink(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Notas da Atualização</label>
          <textarea
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-green-500 focus:outline-none"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <input
            type="checkbox"
            id="activeUpdate"
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <label htmlFor="activeUpdate" className="text-sm text-zinc-300 flex-1">
            <span className="font-semibold">Ativar verificação de atualização</span>
            <p className="text-xs text-zinc-500 mt-1">Quando desativado, o app não mostrará o modal de atualização</p>
          </label>
        </div>

        <div className="flex items-center gap-2"
          >
          <input
            type="checkbox"
            id="forceUpdate"
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-green-600 focus:ring-green-500"
            checked={forceUpdate}
            onChange={(e) => setForceUpdate(e.target.checked)}
          />
          <label htmlFor="forceUpdate" className="text-sm text-zinc-300">
            Forçar atualização (bloqueia o app até atualizar)
          </label>
        </div>

        {message && (
          <p className={`text-sm ${message.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  );
};
