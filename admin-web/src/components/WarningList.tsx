import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Plus, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface Warning {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  active: boolean;
  createdAt: string;
}

export const WarningList = () => {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'danger'>('info');

  useEffect(() => {
    fetchWarnings();
  }, []);

  const fetchWarnings = async () => {
    try {
      const response = await axios.get('/admin/warnings');
      setWarnings(response.data);
    } catch (error) {
      console.error('Error fetching warnings', error);
    }
  };

  const handleAddWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/admin/warnings', { title, message, type });
      setTitle('');
      setMessage('');
      fetchWarnings();
    } catch (error) {
      console.error('Error adding warning', error);
    }
  };

  const handleDeleteWarning = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
    try {
      await axios.delete(`/admin/warnings/${id}`);
      fetchWarnings();
    } catch (error) {
      console.error('Error deleting warning', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-yellow-500" />;
      case 'danger': return <AlertCircle className="text-red-500" />;
      default: return <Info className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Novo Aviso</h3>
        <form onSubmit={handleAddWarning} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Título"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-green-500 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <textarea
              placeholder="Mensagem"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-green-500 focus:outline-none"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-4">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-green-500 focus:outline-none"
            >
              <option value="info">Informação</option>
              <option value="warning">Alerta</option>
              <option value="danger">Urgente</option>
            </select>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500 transition-colors"
            >
              <Plus size={20} />
              Adicionar
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {warnings.map((warning) => (
          <div key={warning._id} className="flex items-start justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex gap-4">
              <div className="mt-1">{getTypeIcon(warning.type)}</div>
              <div>
                <h4 className="font-semibold text-white">{warning.title}</h4>
                <p className="text-zinc-400">{warning.message}</p>
                <span className="mt-2 inline-block text-xs text-zinc-600">
                  {new Date(warning.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteWarning(warning._id)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
