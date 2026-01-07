import { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

// URL base para APIs (sem /auth no final)
const API_BASE_URL = CONFIG.BACKEND_URL;

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
}

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    hasSubscription: false,
  });
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@FutScore:token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Erro ao buscar status de assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckoutUrl = async () => {
    try {
      console.log('[Checkout] Iniciando fetchCheckoutUrl...');
      console.log('[Checkout] API_BASE_URL:', API_BASE_URL);
      
      const token = await AsyncStorage.getItem('@FutScore:token');
      console.log('[Checkout] Token obtido:', token ? 'SIM' : 'NÃO');
      
      if (!token) {
        console.log('[Checkout] ERRO: Token não encontrado no AsyncStorage');
        return null;
      }

      const url = `${API_BASE_URL}/api/subscription/checkout-url`;
      console.log('[Checkout] Fazendo requisição para:', url);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[Checkout] Resposta recebida:', JSON.stringify(response.data));
      setCheckoutUrl(response.data.checkoutUrl);
      return response.data.checkoutUrl;
    } catch (error: any) {
      console.error('[Checkout] ERRO ao buscar URL de checkout:', error?.message);
      console.error('[Checkout] Status:', error?.response?.status);
      console.error('[Checkout] Data:', JSON.stringify(error?.response?.data));
      return null;
    }
  };

  const refreshSubscription = async () => {
    setLoading(true);
    await fetchSubscriptionStatus();
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  return {
    isPremium: subscriptionStatus.isPremium,
    hasSubscription: subscriptionStatus.hasSubscription,
    subscription: subscriptionStatus.subscription,
    loading,
    checkoutUrl,
    fetchCheckoutUrl,
    refreshSubscription,
  };
};
