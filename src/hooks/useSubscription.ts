import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * Hook para acessar o estado de subscription.
 * Agora usa o SubscriptionContext para garantir que todos os componentes
 * compartilhem o mesmo estado de isPremium.
 */
export const useSubscription = () => {
  return useSubscriptionContext();
};
