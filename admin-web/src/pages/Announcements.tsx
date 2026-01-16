import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Eye, Send } from 'lucide-react';

interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: 'update' | 'feature' | 'promo' | 'alert' | 'news';
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  actionType: 'none' | 'link' | 'screen' | 'dismiss';
  actionTarget: string;
  actionLabel: string;
  imageUrl: string;
  priority: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  targetAudience: 'all' | 'premium' | 'free';
  viewCount: number;
  createdAt: string;
}

const ANNOUNCEMENT_TYPES = [
  { value: 'update', label: '🔄 Atualização', colors: ['#8b5cf6', '#6366f1'] },
  { value: 'feature', label: '✨ Nova Função', colors: ['#22c55e', '#16a34a'] },
  { value: 'promo', label: '🎁 Promoção', colors: ['#f59e0b', '#d97706'] },
  { value: 'alert', label: '⚠️ Alerta', colors: ['#ef4444', '#dc2626'] },
  { value: 'news', label: '📰 Notícias', colors: ['#3b82f6', '#2563eb'] },
];

const EMOJIS = ['🎉', '🚀', '⭐', '🔥', '💎', '🎯', '📢', '💡', '🎁', '✨', '🏆', '💪'];

const API_URL = import.meta.env.VITE_API_URL || 'https://futscore-production.up.railway.app';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'news' as Announcement['type'],
    icon: '🎉',
    primaryColor: '#22c55e',
    secondaryColor: '#16a34a',
    actionType: 'dismiss' as Announcement['actionType'],
    actionTarget: '',
    actionLabel: 'Entendi',
    priority: 0,
    isActive: true,
    targetAudience: 'all' as Announcement['targetAudience'],
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/announcements/admin/all`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: Announcement['type']) => {
    const typeConfig = ANNOUNCEMENT_TYPES.find(t => t.value === type);
    setForm({
      ...form,
      type,
      primaryColor: typeConfig?.colors[0] || '#22c55e',
      secondaryColor: typeConfig?.colors[1] || '#16a34a',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingAnnouncement
        ? `${API_URL}/api/announcements/admin/${editingAnnouncement._id}`
        : `${API_URL}/api/announcements/admin/create`;

      const method = editingAnnouncement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingAnnouncement(null);
        resetForm();
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      icon: announcement.icon,
      primaryColor: announcement.primaryColor,
      secondaryColor: announcement.secondaryColor,
      actionType: announcement.actionType,
      actionTarget: announcement.actionTarget,
      actionLabel: announcement.actionLabel,
      priority: announcement.priority,
      isActive: announcement.isActive,
      targetAudience: announcement.targetAudience,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;

    try {
      const response = await fetch(`${API_URL}/api/announcements/admin/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/announcements/admin/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      type: 'news',
      icon: '🎉',
      primaryColor: '#22c55e',
      secondaryColor: '#16a34a',
      actionType: 'dismiss',
      actionTarget: '',
      actionLabel: 'Entendi',
      priority: 0,
      isActive: true,
      targetAudience: 'all',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">📢 Anúncios</h1>
          <p className="text-gray-400 text-sm">
            Gerencie os anúncios e novidades que aparecem no app
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingAnnouncement(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Anúncio
        </button>
      </div>

      {/* Announcements List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Send size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">Nenhum anúncio criado ainda</p>
            <p className="text-gray-500 text-sm">Clique em "Novo Anúncio" para começar</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement._id}
              className={`bg-zinc-900 rounded-lg border ${
                announcement.isActive ? 'border-zinc-700' : 'border-zinc-800 opacity-60'
              } p-4 hover:border-zinc-600 transition-colors`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${announcement.primaryColor}30` }}
                >
                  {announcement.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: `linear-gradient(90deg, ${announcement.primaryColor}, ${announcement.secondaryColor})`,
                        color: 'white',
                      }}
                    >
                      {ANNOUNCEMENT_TYPES.find(t => t.value === announcement.type)?.label || announcement.type}
                    </span>
                    {!announcement.isActive && (
                      <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold truncate">{announcement.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{announcement.message}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {announcement.viewCount} views
                    </span>
                    <span>Prioridade: {announcement.priority}</span>
                    <span>Público: {announcement.targetAudience}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(announcement._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      announcement.isActive
                        ? 'bg-green-600/20 text-green-500 hover:bg-green-600/30'
                        : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                    }`}
                    title={announcement.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {announcement.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 rounded-lg bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement._id)}
                    className="p-2 rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600/30 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingAnnouncement ? '✏️ Editar Anúncio' : '📢 Novo Anúncio'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tipo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ANNOUNCEMENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeChange(type.value as Announcement['type'])}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          form.type === type.value
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setForm({ ...form, icon: emoji })}
                        className={`w-10 h-10 rounded-lg text-xl transition-all ${
                          form.icon === emoji
                            ? 'bg-green-600 scale-110'
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Título *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                    placeholder="Ex: Nova funcionalidade!"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Mensagem *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none resize-none"
                    placeholder="Descreva a novidade..."
                    rows={3}
                    required
                    maxLength={500}
                  />
                </div>

                {/* Action Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Ação do Botão</label>
                  <select
                    value={form.actionType}
                    onChange={(e) => setForm({ ...form, actionType: e.target.value as Announcement['actionType'] })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="dismiss">Apenas Fechar</option>
                    <option value="link">Abrir Link</option>
                    <option value="screen">Navegar para Tela</option>
                    <option value="none">Sem Botão</option>
                  </select>
                </div>

                {/* Action Target */}
                {(form.actionType === 'link' || form.actionType === 'screen') && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      {form.actionType === 'link' ? 'URL' : 'Nome da Tela'}
                    </label>
                    <input
                      type="text"
                      value={form.actionTarget}
                      onChange={(e) => setForm({ ...form, actionTarget: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      placeholder={form.actionType === 'link' ? 'https://...' : 'Predictions'}
                    />
                  </div>
                )}

                {/* Action Label */}
                {form.actionType !== 'none' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Texto do Botão</label>
                    <input
                      type="text"
                      value={form.actionLabel}
                      onChange={(e) => setForm({ ...form, actionLabel: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      placeholder="Ex: Ver mais"
                    />
                  </div>
                )}

                {/* Priority & Audience */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Prioridade</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Público</label>
                    <select
                      value={form.targetAudience}
                      onChange={(e) => setForm({ ...form, targetAudience: e.target.value as Announcement['targetAudience'] })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="all">Todos</option>
                      <option value="premium">Só Premium</option>
                      <option value="free">Só Gratuitos</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Preview</label>
                  <div
                    className="p-4 rounded-xl border"
                    style={{
                      background: `linear-gradient(135deg, ${form.primaryColor}20, ${form.secondaryColor}10)`,
                      borderColor: `${form.primaryColor}40`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${form.primaryColor}30` }}
                      >
                        {form.icon}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{form.title || 'Título do anúncio'}</p>
                        <p className="text-gray-400 text-sm">{form.message || 'Mensagem do anúncio...'}</p>
                      </div>
                    </div>
                    {form.actionType !== 'none' && (
                      <div
                        className="mt-3 py-2 rounded-lg text-center text-white text-sm font-semibold"
                        style={{
                          background: `linear-gradient(90deg, ${form.primaryColor}, ${form.secondaryColor})`,
                        }}
                      >
                        {form.actionLabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAnnouncement(null);
                    }}
                    className="flex-1 py-2 bg-zinc-800 text-gray-400 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : editingAnnouncement ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
