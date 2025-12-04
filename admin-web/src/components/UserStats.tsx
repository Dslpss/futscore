import { useEffect, useState } from "react";
import { Users, Bell, UserPlus, Star, Shield, TrendingUp } from "lucide-react";

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
  createdAt: string;
  hasPushToken: boolean;
  favoriteTeamsCount: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const UserStats = () => {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/users/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUsers(data);
      setShowUserList(true);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                    🔔
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                    ⭐
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
                          </p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {formatDate(user.createdAt)}
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
                    <td className="px-4 py-3 text-center text-xs text-zinc-400">
                      {user.favoriteTeamsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
