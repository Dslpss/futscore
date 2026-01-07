import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/subscription/status`, {
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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return null;
      }

      const response = await axios.get(`${API_URL}/subscription/checkout-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCheckoutUrl(response.data.checkoutUrl);
      return response.data.checkoutUrl;
    } catch (error) {
      console.error('Erro ao buscar URL de checkout:', error);
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
