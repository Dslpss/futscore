import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Settings, Power, ShieldAlert } from 'lucide-react';

export const SystemControl = () => {
  const [channelsMaintenance, setChannelsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/system-settings');
      // Set state based on response key 'channels_maintenance'
      if (response.data && typeof response.data.channels_maintenance !== 'undefined') {
        setChannelsMaintenance(response.data.channels_maintenance);
      }
    } catch (error) {
      console.error('Error fetching system settings', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = async () => {
    const newVal = !channelsMaintenance;
    try {
      const response = await axios.put('/admin/system-settings', {
        channels_maintenance: newVal
      });
      // Update local state with the returned value from backend to be sure
      if (response.data && typeof response.data.channels_maintenance !== 'undefined') {
        setChannelsMaintenance(response.data.channels_maintenance);
      } else {
         // Fallback manual update
         setChannelsMaintenance(newVal);
      }
    } catch (error) {
      console.error('Error updating system settings', error);
      alert('Failed to update settings');
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-blue-500/10 p-2">
          <Settings className="h-6 w-6 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-white">Controle do Sistema</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3">
             <div className={`rounded-full p-2 ${channelsMaintenance ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {channelsMaintenance ? (
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                ) : (
                    <Power className="h-5 w-5 text-green-500" />
                )}
             </div>
             <div>
                <h3 className="font-semibold text-white">Manutenção de Canais</h3>
                <p className="text-sm text-zinc-400">
                    {channelsMaintenance 
                        ? 'O sistema de canais está bloqueado para todos os usuários.' 
                        : 'O sistema está operando normalmente.'}
                </p>
             </div>
          </div>
          
          <button
            onClick={toggleMaintenance}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
              channelsMaintenance ? 'bg-red-600' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                channelsMaintenance ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
