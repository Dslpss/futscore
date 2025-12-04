import { useAuth } from "../context/AuthContext";
import { WarningList } from "../components/WarningList";
import { UpdateManager } from "../components/UpdateManager";
import { UserStats } from "../components/UserStats";
import { LogOut, LayoutDashboard } from "lucide-react";

export const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <LayoutDashboard className="h-6 w-6 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-white">FutScore Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Olá, {user?.name}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6">
        {/* User Stats Section */}
        <div className="mb-6">
          <h2 className="mb-4 text-xl font-bold text-white">
            📊 Estatísticas de Usuários
          </h2>
          <UserStats />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-bold text-white">
              Avisos do Sistema
            </h2>
            <WarningList />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold text-white">Gerenciar App</h2>
            <UpdateManager />
          </div>
        </div>
      </main>
    </div>
  );
};
