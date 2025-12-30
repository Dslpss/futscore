import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import axios from 'axios';
import { CONFIG } from '../constants/config';

interface VersionBlockerProps {
  children: React.ReactNode;
}

// Compare semantic versions: returns true if current < minimum
const isVersionOutdated = (current: string, minimum: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const currentPart = currentParts[i] || 0;
    const minimumPart = minimumParts[i] || 0;
    
    if (currentPart < minimumPart) return true;
    if (currentPart > minimumPart) return false;
  }
  
  return false; // Equal versions
};

export const VersionBlocker: React.FC<VersionBlockerProps> = ({ children }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadLink, setDownloadLink] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  
  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    checkVersionBlock();
  }, []);

  const checkVersionBlock = async () => {
    try {
      // Fetch minimum version and latest version info in parallel
      const [minVersionRes, latestVersionRes] = await Promise.all([
        axios.get(`${CONFIG.BACKEND_URL}/admin/system-settings/minimum_app_version`).catch(() => ({ data: { value: null } })),
        axios.get(`${CONFIG.BACKEND_URL}/admin/version`).catch(() => ({ data: null })),
      ]);

      const minVersion = minVersionRes.data?.value;
      const latest = latestVersionRes.data;

      if (minVersion && isVersionOutdated(currentVersion, minVersion)) {
        setIsBlocked(true);
        setMinimumVersion(minVersion);
        setLatestVersion(latest?.version || minVersion);
        setDownloadLink(latest?.downloadLink || '');
      }
    } catch (error) {
      console.error('[VersionBlocker] Error checking version:', error);
      // On error, allow access (fail open)
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadLink) {
      Linking.openURL(downloadLink);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#09090b', '#1a1a1e']}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Verificando versão...</Text>
      </View>
    );
  }

  if (isBlocked) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#09090b', '#1a1a1e']}
          style={StyleSheet.absoluteFillObject}
        />
        
        <LinearGradient
          colors={['#ef444430', '#ef444410']}
          style={styles.iconContainer}
        >
          <Ionicons name="warning" size={64} color="#ef4444" />
        </LinearGradient>

        <Text style={styles.title}>Atualização Obrigatória</Text>
        
        <Text style={styles.message}>
          Sua versão ({currentVersion}) está desatualizada.
        </Text>
        
        <Text style={styles.messageSecondary}>
          A versão mínima exigida é <Text style={styles.versionHighlight}>{minimumVersion}</Text>
        </Text>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60a5fa" />
          <Text style={styles.infoText}>
            Por favor, atualize o app para continuar utilizando. Esta atualização contém melhorias importantes de segurança.
          </Text>
        </View>

        {downloadLink ? (
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.downloadGradient}
            >
              <Ionicons name="download" size={24} color="#fff" />
              <Text style={styles.downloadText}>Baixar v{latestVersion}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.noLinkContainer}>
            <Ionicons name="alert-circle" size={20} color="#fbbf24" />
            <Text style={styles.noLinkText}>
              Link de download não disponível. Entre em contato com o suporte.
            </Text>
          </View>
        )}

        <Text style={styles.footerText}>
          Versão atual: {currentVersion}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#09090b',
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 4,
  },
  messageSecondary: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  versionHighlight: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e3a5f30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#60a5fa30',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#93c5fd',
    fontSize: 14,
    lineHeight: 20,
  },
  downloadButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  downloadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  downloadText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf2420',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  noLinkText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 14,
  },
  footerText: {
    color: '#52525b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default VersionBlocker;
