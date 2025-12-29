import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tv, RefreshCw, Trash2, Eye, EyeOff, TrendingUp } from 'lucide-react';

interface Channel {
  _id: string;
  name: string;
  url: string;
  logo: string | null;
  category: string;
  country: string | null;
  language: string | null;
  groupTitle: string | null;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
}

interface ChannelStats {
  totalChannels: number;
  activeChannels: number;
  sportsChannels: number;
  inactiveChannels: number;
  mostViewed: Channel[];
}

export const ChannelManager = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadChannels();
    loadStats();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/channels/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChannels(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar canais');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/channels/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/channels/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`✅ ${response.data.message} - Novos: ${response.data.new}, Atualizados: ${response.data.updated}`);
      await loadChannels();
      await loadStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao sincronizar canais');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/channels/${id}`, 
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadChannels();
      await loadStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar canal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este canal?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/channels/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadChannels();
      await loadStats();
      setSuccess('Canal deletado com sucesso');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao deletar canal');
    }
  };

  const filteredChannels = channels.filter(channel => {
    if (filter === 'active') return channel.isActive;
    if (filter === 'inactive') return !channel.isActive;
    return true;
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
            <Tv size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Gerenciar Canais de TV</h3>
            <p className="text-xs text-zinc-500">Sincronize e gerencie canais esportivos</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar M3U'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg bg-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{stats.totalChannels}</p>
          </div>
          <div className="rounded-lg bg-green-500/10 p-4">
            <p className="text-xs text-green-500 mb-1">Ativos</p>
            <p className="text-2xl font-bold text-green-500">{stats.activeChannels}</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-4">
            <p className="text-xs text-red-500 mb-1">Inativos</p>
            <p className="text-2xl font-bold text-red-500">{stats.inactiveChannels}</p>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-4">
            <p className="text-xs text-purple-500 mb-1">Esporte</p>
            <p className="text-2xl font-bold text-purple-500">{stats.sportsChannels}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Todos ({channels.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Ativos ({channels.filter(c => c.isActive).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'inactive'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Inativos ({channels.filter(c => !c.isActive).length})
        </button>
      </div>

      {/* Channels List */}
      {loading ? (
        <div className="text-center py-8 text-zinc-500">Carregando canais...</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredChannels.map((channel) => (
            <div
              key={channel._id}
              className="flex items-center gap-4 p-4 rounded-lg bg-zinc-800 hover:bg-zinc-750 transition-colors"
            >
              {/* Logo */}
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-12 h-12 rounded object-contain bg-zinc-900"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded bg-zinc-700 flex items-center justify-center">
                  <Tv size={20} className="text-zinc-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{channel.name}</p>
                <div className="flex gap-2 mt-1">
                  {channel.groupTitle && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      {channel.groupTitle}
                    </span>
                  )}
                  {channel.country && (
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">
                      {channel.country}
                    </span>
                  )}
                </div>
              </div>

              {/* View Count */}
              <div className="flex items-center gap-1 text-zinc-400">
                <TrendingUp size={14} />
                <span className="text-xs">{channel.viewCount}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(channel._id, channel.isActive)}
                  className={`p-2 rounded-lg transition-colors ${
                    channel.isActive
                      ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                  title={channel.isActive ? 'Desativar' : 'Ativar'}
                >
                  {channel.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <button
                  onClick={() => handleDelete(channel._id)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                  title="Deletar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {filteredChannels.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              Nenhum canal encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};
