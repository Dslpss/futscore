import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, AlertCircle } from 'lucide-react-native';

interface UpdateModalProps {
  visible: boolean;
  version: string;
  downloadLink: string;
  forceUpdate: boolean;
  notes?: string;
  onClose: () => void;
}

export const UpdateModal = ({ visible, version, downloadLink, forceUpdate, notes, onClose }: UpdateModalProps) => {
  const handleUpdate = () => {
    Linking.openURL(downloadLink);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !forceUpdate && onClose()}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#18181b', '#09090b']}
            style={styles.content}
          >
            <View style={styles.iconContainer}>
              <Download size={32} color="#22c55e" />
            </View>

            <Text style={styles.title}>Nova Atualização Disponível!</Text>
            <Text style={styles.version}>Versão {version}</Text>

            {notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>O que há de novo:</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            )}

            {forceUpdate && (
              <View style={styles.warningContainer}>
                <AlertCircle size={16} color="#ef4444" />
                <Text style={styles.warningText}>Esta atualização é obrigatória.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Atualizar Agora</Text>
              </LinearGradient>
            </TouchableOpacity>

            {!forceUpdate && (
              <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterText}>Lembrar depois</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 24,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#27272a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  notesTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  notesText: {
    color: '#d4d4d8',
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  warningText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  updateButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    marginTop: 16,
    padding: 8,
  },
  laterText: {
    color: '#71717a',
    fontSize: 14,
  },
});
