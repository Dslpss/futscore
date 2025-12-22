import React, { useState } from 'react';
import axios from 'axios';
import { Bell, Send, AlertCircle, CheckCircle } from 'lucide-react';

interface NotificationResult {
  message: string;
  sentCount: number;
  errorCount?: number;
  totalEligible: number;
}

export const UpdateNotificationSender = () => {
  const [title, setTitle] = useState('🚀 Nova Atualização Disponível!');
  const [body, setBody] = useState('');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NotificationResult | null>(null);
  const [error, setError] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !body.trim()) {
      setError('Preencha o título e a mensagem.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await axios.post<NotificationResult>('/admin/notifications/update', {
        title,
        body,
        version: version.trim() || undefined
      });
      
      setResult(response.data);
    } catch (err: any) {
      console.error('Error sending notification:', err);
      setError(err.response?.data?.message || 'Erro ao enviar notificação.');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Preencha o título e a mensagem.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await axios.post<NotificationResult>('/admin/notifications/broadcast', {
        title,
        body
      });
      
      setResult(response.data);
    } catch (err: any) {
      console.error('Error sending notification:', err);
      setError(err.response?.data?.message || 'Erro ao enviar notificação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Enviar Notificação</h3>
          <p className="text-xs text-zinc-500">Notifique todos os usuários sobre atualizações</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
          <input
            type="text"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-purple-500 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="🚀 Nova Atualização Disponível!"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Mensagem</label>
          <textarea
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-purple-500 focus:outline-none"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Uma nova versão do FutScore está disponível! Atualize agora para ter acesso às novidades."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Versão <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-purple-500 focus:outline-none"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="Ex: 1.5.0"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle size={16} className="mt-0.5" />
            <div>
              <p className="font-medium">{result.message}</p>
              <p className="text-xs text-green-500/80 mt-1">
                ✅ Enviados: {result.sentCount} | 
                {result.errorCount ? ` ❌ Erros: ${result.errorCount} |` : ''} 
                {' '}👥 Total elegível: {result.totalEligible}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
            {loading ? 'Enviando...' : 'Enviar Atualização'}
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4 mt-4">
          <p className="text-xs text-zinc-500 mb-2">
            Ou envie uma notificação personalizada (sem dados de versão):
          </p>
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <Bell size={16} />
            Broadcast Geral
          </button>
        </div>
      </form>
    </div>
  );
};
