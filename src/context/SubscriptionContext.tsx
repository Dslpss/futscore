import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

// URL base para APIs (sem /auth no final)
const API_BASE_URL = CONFIG.BACKEND_URL;

interface TrialStatus {
  hasTrialAvailable: boolean;
  isTrialActive: boolean;
  trialUsed: boolean;
  trialEndDate: string | null;
  daysRemaining: number;
}

interface PendingGift {
  days: number;
  message: string;
}

interface SubscriptionStatus {
  isPremium: boolean;
  hasSubscription: boolean;
  subscription?: {
    status: string;
    startDate: string;
    endDate: string;
    renewalDate: string;
    amount: number;
    paymentMethod: string;
  };
  trial?: TrialStatus;
  pendingGift?: PendingGift | null;
}

interface SubscriptionContextType {
  isPremium: boolean;
  hasSubscription: boolean;
  subscription?: SubscriptionStatus['subscription'];
  loading: boolean;
  checkoutUrl: string | null;
  fetchCheckoutUrl: () => Promise<string | null>;
  refreshSubscription: () => Promise<void>;
  // Trial
  hasTrialAvailable: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialEndDate: string | null;
  activateTrial: () => Promise<{ success: boolean; message: string; trialEndDate?: string }>;
  activatingTrial: boolean;
  // Gift
  pendingGift: PendingGift | null;
  claimGift: () => Promise<{ success: boolean; message: string; giftEndDate?: string }>;
  claimingGift: boolean;
  // Maintenance
  isChannelsMaintenance: boolean;
  refreshMaintenance: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    hasSubscription: false,
  });
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [claimingGift, setClaimingGift] = useState(false);
  const [isChannelsMaintenance, setIsChannelsMaintenance] = useState(false);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@FutScore:token');
      if (!token) {
        console.log('[SubscriptionContext] No token found, setting loading to false');
        setLoading(false);
        return;
      }

      console.log('[SubscriptionContext] Fetching subscription status...');
      const response = await axios.get(`${API_BASE_URL}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[SubscriptionContext] API Response isPremium:', response.data.isPremium);
      
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('[SubscriptionContext] Erro ao buscar status de assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceStatus = async () => {
    try {
      console.log('[SubscriptionContext] Checking channels maintenance status...');
      // Note: A rota está montada em /admin, não em /api/admin
      const response = await axios.get(`${API_BASE_URL}/admin/system-settings/channels_maintenance`);
      
      const isMaintenance = response.data?.value === true;
      console.log('[SubscriptionContext] Channels maintenance response:', response.data);
      console.log('[SubscriptionContext] Channels maintenance:', isMaintenance);
      setIsChannelsMaintenance(isMaintenance);
    } catch (error: any) {
      console.error('[SubscriptionContext] Error checking maintenance:', error?.message || error);
      setIsChannelsMaintenance(false);
    }
  };

  const refreshMaintenance = async () => {
    await fetchMaintenanceStatus();
  };

  const fetchCheckoutUrl = async () => {
    try {
      console.log('[SubscriptionContext] Iniciando fetchCheckoutUrl...');
      
      const token = await AsyncStorage.getItem('@FutScore:token');
      
      if (!token) {
        console.log('[SubscriptionContext] ERRO: Token não encontrado no AsyncStorage');
        return null;
      }

      const url = `${API_BASE_URL}/api/subscription/checkout-url`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCheckoutUrl(response.data.checkoutUrl);
      return response.data.checkoutUrl;
    } catch (error: any) {
      console.error('[SubscriptionContext] ERRO ao buscar URL de checkout:', error?.message);
      return null;
    }
  };

  const activateTrial = async (): Promise<{ success: boolean; message: string; trialEndDate?: string }> => {
    setActivatingTrial(true);
    try {
      const token = await AsyncStorage.getItem('@FutScore:token');
      if (!token) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/subscription/activate-trial`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[SubscriptionContext] Trial ativado com sucesso:', response.data);
      
      // Atualizar status local
      await fetchSubscriptionStatus();

      return {
        success: true,
        message: response.data.message || 'Trial ativado com sucesso!',
        trialEndDate: response.data.trialEndDate,
      };
    } catch (error: any) {
      console.error('[SubscriptionContext] Erro ao ativar trial:', error?.response?.data || error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || 'Erro ao ativar trial',
      };
    } finally {
      setActivatingTrial(false);
    }
  };

  const refreshSubscription = async () => {
    setLoading(true);
    await fetchSubscriptionStatus();
  };

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchMaintenanceStatus();
  }, []);

  // Claim gift function
  const claimGift = async (): Promise<{ success: boolean; message: string; giftEndDate?: string }> => {
    setClaimingGift(true);
    try {
      const token = await AsyncStorage.getItem('@FutScore:token');
      if (!token) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/subscription/claim-gift`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[SubscriptionContext] Gift resgatado com sucesso:', response.data);
      
      // Atualizar status local
      await fetchSubscriptionStatus();

      return {
        success: true,
        message: response.data.message || 'Presente ativado com sucesso!',
        giftEndDate: response.data.giftEndDate,
      };
    } catch (error: any) {
      console.error('[SubscriptionContext] Erro ao resgatar gift:', error?.response?.data || error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || 'Erro ao resgatar presente',
      };
    } finally {
      setClaimingGift(false);
    }
  };

  // Derived values
  const trial = subscriptionStatus.trial;
  const hasTrialAvailable = trial?.hasTrialAvailable ?? false;
  const isTrialActive = trial?.isTrialActive ?? false;
  const trialDaysRemaining = trial?.daysRemaining ?? 0;
  const trialEndDate = trial?.trialEndDate ?? null;
  const pendingGift = subscriptionStatus.pendingGift ?? null;

  const value: SubscriptionContextType = {
    isPremium: subscriptionStatus.isPremium,
    hasSubscription: subscriptionStatus.hasSubscription,
    subscription: subscriptionStatus.subscription,
    loading,
    checkoutUrl,
    fetchCheckoutUrl,
    refreshSubscription,
    // Trial
    hasTrialAvailable,
    isTrialActive,
    trialDaysRemaining,
    trialEndDate,
    activateTrial,
    activatingTrial,
    // Gift
    pendingGift,
    claimGift,
    claimingGift,
    // Maintenance
    isChannelsMaintenance,
    refreshMaintenance,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};

