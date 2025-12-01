import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { api } from '../services/api';
import { Player } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

interface TeamDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
  } | null;
}

export const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({ visible, onClose, team }) => {
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && team) {
      loadSquad();
    } else {
      setSquad([]);
    }
  }, [visible, team]);

  const loadSquad = async () => {
    if (!team) return;
    setLoading(true);
    try {
      const data = await api.getSquad(team.id);
      setSquad(data);
    } catch (error) {
      console.error('Error loading squad:', error);
      setSquad([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !team) return null;

  const groupedSquad = {
    Goalkeeper: squad.filter(p => p.pos === 'Goalkeeper'),
    Defender: squad.filter(p => p.pos === 'Defence' || p.pos === 'Defender'),
    Midfielder: squad.filter(p => p.pos === 'Midfield' || p.pos === 'Midfielder'),
    Attacker: squad.filter(p => p.pos === 'Offence' || p.pos === 'Attacker'),
    Coach: squad.filter(p => p.pos === 'Coach'),
  };

  const renderSection = (title: string, players: Player[]) => {
    if (players.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {players.map(player => (
          <View key={player.id} style={styles.playerRow}>
            <Text style={styles.playerNumber}>{player.number || '-'}</Text>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerPosition}>{player.pos}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Elenco</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <LinearGradient colors={['#1c1c1e', '#121212']} style={styles.teamHeader}>
              <Image source={{ uri: team.logo }} style={styles.teamLogo} />
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamCountry}>{team.country}</Text>
            </LinearGradient>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
              </View>
            ) : squad.length > 0 ? (
              <View style={styles.squadContainer}>
                {renderSection('Goleiros', groupedSquad.Goalkeeper)}
                {renderSection('Defensores', groupedSquad.Defender)}
                {renderSection('Meio-Campistas', groupedSquad.Midfielder)}
                {renderSection('Atacantes', groupedSquad.Attacker)}
                {renderSection('Comissão Técnica', groupedSquad.Coach)}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Dados do elenco não disponíveis para este time.</Text>
                <Text style={styles.emptySubtext}>A API pode não ter informações completas para todas as equipes.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'flex-end' },
  modalView: {
    backgroundColor: '#09090b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  content: { paddingBottom: 40 },
  teamHeader: {
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  teamLogo: { width: 80, height: 80, marginBottom: 12, resizeMode: 'contain' },
  teamName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  teamCountry: { color: '#a1a1aa', fontSize: 14 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  squadContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  playerNumber: { color: '#a1a1aa', fontSize: 14, fontWeight: '700', width: 40, textAlign: 'center' },
  playerName: { color: '#fff', fontSize: 16, flex: 1 },
  playerPosition: { color: '#71717a', fontSize: 12, fontWeight: '500' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#71717a', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  emptySubtext: { color: '#52525b', fontSize: 14, textAlign: 'center' },
});
