import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, DollarSign, TrendingUp, Crown } from 'lucide-react';

interface SubscriptionStats {
  totalSubscribers: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  newThisMonth: number;
}

export const SubscriptionStats = () => {
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    monthlyRevenue: 0,
    newThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subscriptions/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-zinc-800 p-6 h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Total de Assinantes</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.totalSubscribers}</p>
          </div>
          <div className="rounded-full bg-green-500/20 p-3">
            <Users className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Assinantes Ativos</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.activeSubscribers}</p>
          </div>
          <div className="rounded-full bg-blue-500/20 p-3">
            <Crown className="h-6 w-6 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Receita Mensal (MRR)</p>
            <p className="text-3xl font-bold text-white mt-2">
              R$ {stats.monthlyRevenue.toFixed(2)}
            </p>
          </div>
          <div className="rounded-full bg-yellow-500/20 p-3">
            <DollarSign className="h-6 w-6 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Novos Este Mês</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.newThisMonth}</p>
          </div>
          <div className="rounded-full bg-purple-500/20 p-3">
            <TrendingUp className="h-6 w-6 text-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
