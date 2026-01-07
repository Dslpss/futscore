import { useState, useEffect } from 'react';
import axios from 'axios';
import { SubscriptionStats } from '../components/SubscriptionStats';
import { Crown, Calendar, CreditCard, Search, Filter, X, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Subscription {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  caktoOrderId: string;
  status: string;
  amount: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'canceled' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch =
      sub.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.userId.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: {
        bg: 'bg-green-500/10',
        text: 'text-green-500',
        border: 'border-green-500/20',
        icon: <CheckCircle size={14} />,
        label: 'Ativo',
      },
      canceled: {
        bg: 'bg-red-500/10',
        text: 'text-red-500',
        border: 'border-red-500/20',
        icon: <XCircle size={14} />,
        label: 'Cancelado',
      },
      expired: {
        bg: 'bg-zinc-500/10',
        text: 'text-zinc-500',
        border: 'border-zinc-500/20',
        icon: <Clock size={14} />,
        label: 'Expirado',
      },
      pending: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-500',
        border: 'border-yellow-500/20',
        icon: <Clock size={14} />,
        label: 'Pendente',
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
      >
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-3">
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Assinaturas Premium</h1>
              <p className="text-sm text-zinc-400">
                Gerencie todas as assinaturas do OnFootBall
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <SubscriptionStats />
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-10 text-white placeholder-zinc-400 focus:border-green-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-zinc-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-green-500 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="canceled">Canceladas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
              <p className="mt-4 text-zinc-400">Carregando assinaturas...</p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-12 text-center">
              <Crown className="mx-auto h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-lg font-medium text-zinc-400">
                {searchTerm || filter !== 'all'
                  ? 'Nenhuma assinatura encontrada'
                  : 'Ainda não há assinaturas'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Usuário
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Início
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Vencimento
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Pagamento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((subscription) => (
                    <tr
                      key={subscription._id}
                      className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/30"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{subscription.userId.name}</p>
                          <p className="text-sm text-zinc-400">{subscription.userId.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(subscription.status)}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-green-500">
                          R$ {subscription.amount.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Calendar size={14} />
                          {new Date(subscription.startDate).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Calendar size={14} />
                          {new Date(subscription.endDate).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <CreditCard size={14} />
                          {subscription.paymentMethod?.toUpperCase() || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-zinc-400">
          Exibindo {filteredSubscriptions.length} de {subscriptions.length} assinaturas
        </div>
      </div>
    </div>
  );
};
