import { useState, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

interface UseNotificationPermissionReturn {
  checkAndRequestPermission: () => Promise<boolean>;
  showPermissionDeniedAlert: () => void;
  isPermissionGranted: boolean | null;
}

/**
 * Hook para verificar e solicitar permissão de notificações
 * Mostra um alerta explicativo quando a permissão é negada
 */
export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);

  const showPermissionDeniedAlert = useCallback(() => {
    Alert.alert(
      '🔔 Notificações Desativadas',
      'Para receber alertas sobre gols, início de partidas e seus times favoritos, você precisa ativar as notificações.\n\n' +
      'Como ativar:\n' +
      '1. Toque em "Ir para Configurações"\n' +
      '2. Encontre "Notificações" ou "Permissões"\n' +
      '3. Ative as notificações para o FutScore',
      [
        {
          text: 'Agora não',
          style: 'cancel',
        },
        {
          text: 'Ir para Configurações',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            } else {
              Linking.openURL('app-settings:');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  const checkAndRequestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar permissão atual
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        setIsPermissionGranted(true);
        return true;
      }

      // Tentar solicitar permissão
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        setIsPermissionGranted(true);
        return true;
      }

      // Permissão negada - mostrar alerta explicativo
      setIsPermissionGranted(false);
      showPermissionDeniedAlert();
      return false;
    } catch (error) {
      console.error('[useNotificationPermission] Error:', error);
      return false;
    }
  }, [showPermissionDeniedAlert]);

  return {
    checkAndRequestPermission,
    showPermissionDeniedAlert,
    isPermissionGranted,
  };
};

/**
 * Função standalone para verificar e solicitar permissão
 * Útil para usar fora de componentes React
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[checkNotificationPermission] Error:', error);
    return false;
  }
};

/**
 * Wrapper que verifica permissão antes de executar uma ação
 * Se não tiver permissão, mostra o alerta
 */
export const withNotificationPermission = async (
  action: () => void | Promise<void>,
  onPermissionDenied?: () => void
): Promise<boolean> => {
  const hasPermission = await checkNotificationPermission();
  
  if (hasPermission) {
    await action();
    return true;
  }
  
  // Mostrar alerta nativo
  Alert.alert(
    '🔔 Notificações Desativadas',
    'Para receber alertas sobre gols, início de partidas e seus times favoritos, você precisa ativar as notificações.\n\n' +
    'Como ativar:\n' +
    '1. Toque em "Ir para Configurações"\n' +
    '2. Encontre "Notificações" ou "Permissões"\n' +
    '3. Ative as notificações para o FutScore',
    [
      {
        text: 'Agora não',
        style: 'cancel',
        onPress: onPermissionDenied,
      },
      {
        text: 'Ir para Configurações',
        onPress: () => {
          if (Platform.OS === 'android') {
            Linking.openSettings();
          } else {
            Linking.openURL('app-settings:');
          }
        },
      },
    ],
    { cancelable: true }
  );
  
  return false;
};
