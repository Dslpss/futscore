import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Cast,
  X,
  Tv,
  Smartphone,
  Share2,
  Copy,
  ExternalLink,
  CheckCircle,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface CastOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  streamUrl: string;
  channelName: string;
}

const CAST_APPS = [
  {
    id: 'webvideocaster',
    name: 'Web Video Caster',
    description: 'Cast para Chromecast, Fire TV, Roku',
    icon: '📺',
    color: ['#ef4444', '#dc2626'],
    urlScheme: 'webvideocaster://',
    playStore: 'com.nicksoftware.playlocalvideo',
  },
  {
    id: 'vlc',
    name: 'VLC Player',
    description: 'Player versátil com suporte a Cast',
    icon: '🎬',
    color: ['#f97316', '#ea580c'],
    urlScheme: 'vlc://',
    playStore: 'org.videolan.vlc',
  },
  {
    id: 'mxplayer',
    name: 'MX Player',
    description: 'Player com suporte a Chromecast',
    icon: '📱',
    color: ['#3b82f6', '#2563eb'],
    urlScheme: 'intent://',
    playStore: 'com.mxtech.videoplayer.ad',
  },
  {
    id: 'localcast',
    name: 'LocalCast',
    description: 'Cast para Smart TVs e Chromecast',
    icon: '📡',
    color: ['#22c55e', '#16a34a'],
    urlScheme: 'localcast://',
    playStore: 'de.nicksoftware.localcast',
  },
];

export const CastOptionsModal: React.FC<CastOptionsModalProps> = ({
  visible,
  onClose,
  streamUrl,
  channelName,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(streamUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar a URL');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Assistir ${channelName}:\n${streamUrl}`,
        title: channelName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openApp = async (app: typeof CAST_APPS[0]) => {
    let url = '';

    switch (app.id) {
      case 'webvideocaster':
        url = `webvideocaster://cast?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(channelName)}`;
        break;
      case 'vlc':
        url = `vlc://${streamUrl}`;
        break;
      case 'mxplayer':
        url = `intent:${streamUrl}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(channelName)};end`;
        break;
      case 'localcast':
        url = `localcast://cast?url=${encodeURIComponent(streamUrl)}`;
        break;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        onClose();
      } else {
        // Offer to install from Play Store
        Alert.alert(
          `${app.name} não instalado`,
          `Deseja instalar o ${app.name} da Play Store?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Instalar',
              onPress: () => {
                Linking.openURL(
                  `https://play.google.com/store/apps/details?id=${app.playStore}`
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error opening app:', error);
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo');
    }
  };

  const handleOpenExternal = async () => {
    try {
      await Linking.openURL(streamUrl);
      onClose();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a URL');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={30} style={styles.blurContainer}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f1f23', '#0f0f12']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Cast size={24} color="#22c55e" />
                <View>
                  <Text style={styles.title}>Transmitir</Text>
                  <Text style={styles.subtitle}>{channelName}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Cast Apps */}
            <View style={styles.appsSection}>
              <Text style={styles.sectionTitle}>📺 Aplicativos de Cast</Text>
              <Text style={styles.sectionSubtitle}>
                Selecione um app para transmitir para sua TV
              </Text>

              <View style={styles.appsGrid}>
                {CAST_APPS.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={styles.appCard}
                    onPress={() => openApp(app)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={app.color}
                      style={styles.appIconBg}
                    >
                      <Text style={styles.appEmoji}>{app.icon}</Text>
                    </LinearGradient>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appDesc} numberOfLines={2}>
                      {app.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, copiedUrl && styles.actionButtonSuccess]}
                  onPress={handleCopyUrl}
                >
                  {copiedUrl ? (
                    <CheckCircle size={20} color="#22c55e" />
                  ) : (
                    <Copy size={20} color="#fff" />
                  )}
                  <Text style={styles.actionText}>
                    {copiedUrl ? 'Copiado!' : 'Copiar URL'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <Share2 size={20} color="#fff" />
                  <Text style={styles.actionText}>Compartilhar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleOpenExternal}
                >
                  <ExternalLink size={20} color="#fff" />
                  <Text style={styles.actionText}>Abrir URL</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsSection}>
              <Text style={styles.instructionsTitle}>💡 Dica</Text>
              <Text style={styles.instructionsText}>
                Web Video Caster é o app recomendado para transmitir para
                Chromecast, Fire TV Stick, Roku e Smart TVs.
              </Text>
            </View>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  appCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  appIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appEmoji: {
    fontSize: 22,
  },
  appName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  appDesc: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionButtonSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  instructionsSection: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  instructionsTitle: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionsText: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
  },
});

export default CastOptionsModal;
