import { useEffect, useState } from "react";
import { Users, Bell, UserPlus, Star, Shield, TrendingUp, Trash2, Ban, Pause, Play, Crown, Tv, Gem, Gift, X } from "lucide-react";
import axios from "axios";

interface UserStatsData {
  totalUsers: number;
  usersWithPushToken: number;
  admins: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  usersWithFavorites: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  status: "active" | "suspended" | "blocked";
  createdAt: string;
  hasPushToken: boolean;
  favoriteTeamsCount: number;
  canAccessTV: boolean;
  isPremium: boolean;
}

export const UserStats = () => {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Gift Premium Modal state
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftTargetUser, setGiftTargetUser] = useState<User | null>(null);
  const [giftDays, setGiftDays] = useState(7);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftLoading, setGiftLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get("/admin/users/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/admin/users");
      setUsers(response.data);
      setShowUserList(true);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja DELETAR o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    setActionLoading(userId);
    try {
      await axios.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      fetchStats(); // Refresh stats
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao deletar usuário");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeStatus = async (userId: string, newStatus: "active" | "suspended" | "blocked") => {
    setActionLoading(userId);
    try {
      await axios.put(`/admin/users/${userId}/status`, { status: newStatus });
      setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao alterar status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    const action = currentIsAdmin ? "remover privilégios de admin de" : "promover a admin";
    if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) {
      return;
    }
    
    setActionLoading(userId);
    try {
      await axios.put(`/admin/users/${userId}/admin`, { isAdmin: !currentIsAdmin });
      setUsers(users.map(u => u._id === userId ? { ...u, isAdmin: !currentIsAdmin } : u));
      fetchStats(); // Refresh stats
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao alterar status de admin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTVAccess = async (userId: string, currentAccess: boolean) => {
    setActionLoading(userId);
    try {
      await axios.put(`/admin/users/${userId}/tv-access`, { canAccessTV: !currentAccess });
      setUsers(users.map(u => u._id === userId ? { ...u, canAccessTV: !currentAccess } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao alterar acesso à TV");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePremium = async (userId: string, currentPremium: boolean) => {
    setActionLoading(userId);
    try {
      await axios.put(`/admin/users/${userId}/premium`, { isPremium: !currentPremium });
      setUsers(users.map(u => u._id === userId ? { ...u, isPremium: !currentPremium } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao alterar status Premium");
    } finally {
      setActionLoading(null);
    }
  };

  const openGiftModal = (user: User) => {
    setGiftTargetUser(user);
    setGiftDays(7);
    setGiftMessage("");
    setGiftModalOpen(true);
  };

  const handleGiftPremium = async () => {
    if (!giftTargetUser) return;
    
    setGiftLoading(true);
    try {
      await axios.post(`/admin/users/${giftTargetUser._id}/gift-premium`, {
        days: giftDays,
        message: giftMessage || undefined,
      });
      alert(`${giftDays} dias de Premium presenteados para ${giftTargetUser.name}!`);
      setGiftModalOpen(false);
      setGiftTargetUser(null);
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao presentear Premium");
    } finally {
      setGiftLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "blocked":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Bloqueado</span>;
      case "suspended":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Suspenso</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Ativo</span>;
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Users */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.totalUsers || 0}
              </p>
              <p className="text-xs text-zinc-500">Total de Usuários</p>
            </div>
          </div>
        </div>

        {/* With Push Token */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.usersWithPushToken || 0}
              </p>
              <p className="text-xs text-zinc-500">Com Notificações</p>
            </div>
          </div>
        </div>

        {/* New Last 7 Days */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <UserPlus className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.newUsersLast7Days || 0}
              </p>
              <p className="text-xs text-zinc-500">Novos (7 dias)</p>
            </div>
          </div>
        </div>

        {/* New Last 30 Days */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.newUsersLast30Days || 0}
              </p>
              <p className="text-xs text-zinc-500">Novos (30 dias)</p>
            </div>
          </div>
        </div>

        {/* With Favorites */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.usersWithFavorites || 0}
              </p>
              <p className="text-xs text-zinc-500">Com Favoritos</p>
            </div>
          </div>
        </div>

        {/* Admins */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.admins || 0}
              </p>
              <p className="text-xs text-zinc-500">Administradores</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Users Button */}
      <button
        onClick={fetchUsers}
        className="w-full rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
        {showUserList ? "Atualizar Lista" : "Ver Lista de Usuários"}
      </button>

      {/* Users List */}
      {showUserList && users.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                    🔔
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
                          {user.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-1">
                            {user.name}
                            {user.isAdmin && (
                              <Shield className="h-3 w-3 text-red-500" />
                            )}
                            {user.isPremium && (
                              <Gem className="h-3 w-3 text-yellow-500" />
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.hasPushToken ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {actionLoading === user._id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
                        ) : (
                          <>
                            {/* Toggle Status */}
                            {user.status === "active" ? (
                              <>
                                <button
                                  onClick={() => handleChangeStatus(user._id, "suspended")}
                                  className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                                  title="Suspender">
                                  <Pause className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleChangeStatus(user._id, "blocked")}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                  title="Bloquear">
                                  <Ban className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleChangeStatus(user._id, "active")}
                                className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                                title="Ativar">
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* Toggle TV Access */}
                            <button
                              onClick={() => handleToggleTVAccess(user._id, user.canAccessTV)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.canAccessTV 
                                  ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" 
                                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              }`}
                              title={user.canAccessTV ? "Bloquear TV" : "Liberar TV"}>
                              <Tv className="h-4 w-4" />
                            </button>
                            
                            {/* Toggle Admin */}
                              <button
                                onClick={() => handleToggleAdmin(user._id, user.isAdmin)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  user.isAdmin 
                                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" 
                                    : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                }`}
                                title={user.isAdmin ? "Remover Admin" : "Tornar Admin"}>
                                <Crown className="h-4 w-4" />
                              </button>

                              {/* Toggle Premium */}
                              <button
                                onClick={() => handleTogglePremium(user._id, user.isPremium)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  user.isPremium 
                                    ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" 
                                    : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                }`}
                                title={user.isPremium ? "Remover Premium" : "Ativar Premium"}>
                                <Gem className="h-4 w-4" />
                              </button>

                              {/* Gift Premium */}
                              <button
                                onClick={() => openGiftModal(user)}
                                className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                title="Dar dias Premium">
                                <Gift className="h-4 w-4" />
                              </button>
                            
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              className="p-1.5 rounded-lg bg-zinc-700 text-zinc-400 hover:bg-red-500/20 hover:text-red-500 transition-colors"
                              title="Deletar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gift Premium Modal */}
      {giftModalOpen && giftTargetUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Dar dias Premium</h3>
              </div>
              <button
                onClick={() => setGiftModalOpen(false)}
                className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-zinc-300 text-sm">
                Usuário: <span className="text-white font-medium">{giftTargetUser.name}</span>
              </p>
              <p className="text-zinc-500 text-xs">{giftTargetUser.email}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Quantidade de dias</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={giftDays}
                  onChange={(e) => setGiftDays(parseInt(e.target.value) || 7)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mensagem (opcional)</label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder={`Parabéns! Você ganhou ${giftDays} dias de acesso Premium grátis!`}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500 h-20 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setGiftModalOpen(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleGiftPremium}
                disabled={giftLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {giftLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    Presentear
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
