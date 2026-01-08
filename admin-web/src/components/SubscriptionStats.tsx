import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, DollarSign, TrendingUp, Crown, Gift, Clock } from 'lucide-react';

interface SubscriptionStats {
  totalSubscribers: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  newThisMonth: number;
  usersOnActiveTrial: number;
  usersTrialExpired: number;
}

export const SubscriptionStats = () => {
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    monthlyRevenue: 0,
    newThisMonth: 0,
    usersOnActiveTrial: 0,
    usersTrialExpired: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('@FutScoreAdmin:token');
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
      <div className="grid gap-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-zinc-800 p-6 h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Total Assinantes</p>
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

      {/* Trial Ativo */}
      <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Em Trial (7 dias)</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.usersOnActiveTrial}</p>
          </div>
          <div className="rounded-full bg-emerald-500/20 p-3">
            <Gift className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Trial Expirado */}
      <div className="rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Trial Expirado</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.usersTrialExpired}</p>
          </div>
          <div className="rounded-full bg-orange-500/20 p-3">
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Receita Mensal</p>
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

