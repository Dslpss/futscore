import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, StatusBar, TouchableOpacity, Dimensions, Platform, ScrollView, Modal, Alert } from 'react-native';
import { useMatches } from '../context/MatchContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { MatchCard } from '../components/MatchCard';
import { LinearGradient } from 'expo-linear-gradient';
import { WarningCard } from '../components/WarningCard';
import { UpdateModal } from '../components/UpdateModal';
import axios from 'axios';
import { api } from '../services/api';
import { CONFIG } from '../constants/config';
import { Match } from '../types';

const { width } = Dimensions.get('window');

interface Warning {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
}

export const HomeScreen = ({ navigation }: any) => {
  const { liveMatches, todaysMatches, loading: contextLoading, refreshMatches: contextRefresh } = useMatches();
  const { favoriteTeams } = useFavorites();
  const { user, signOut } = useAuth();
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Date Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customMatches, setCustomMatches] = useState<Match[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const loading = isToday(selectedDate) ? contextLoading : loadingCustom;

  const refreshMatches = async () => {
    if (isToday(selectedDate)) {
      await contextRefresh();
    } else {
      await fetchMatchesForDate(selectedDate);
    }
  };

  useEffect(() => {
    if (!isToday(selectedDate)) {
      fetchMatchesForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchMatchesForDate = async (date: Date) => {
    setLoadingCustom(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const leagueIds = Object.values(CONFIG.LEAGUE_IDS) as string[];
      
      let allMatches: Match[] = [];
      // Fetch in parallel for better performance
      const promises = leagueIds.map(id => api.getFixtures(id, dateStr));
      const results = await Promise.all(promises);
      
      results.forEach(matches => {
        allMatches = [...allMatches, ...matches];
      });
      
      setCustomMatches(allMatches);
    } catch (error) {
      console.error('Error fetching custom matches', error);
    } finally {
      setLoadingCustom(false);
    }
  };

  useEffect(() => {
    fetchWarnings();
    checkUpdate();
  }, []);

  const fetchWarnings = async () => {
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/admin/warnings`);
      // Deduplicate warnings
      const uniqueWarnings = Array.from(new Map(response.data.map((w: Warning) => [w._id, w])).values());
      setWarnings(uniqueWarnings as Warning[]);
    } catch (error) {
      console.error('Error fetching warnings', error);
    }
  };

  const checkUpdate = async () => {
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/admin/version`);
      const latestVersion = response.data;
      const currentVersion = Constants.expoConfig?.version || '1.0.0';

      if (latestVersion && latestVersion.active && latestVersion.version > currentVersion) {
        setUpdateInfo(latestVersion);
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error('Error checking update', error);
    }
  };

  const leagues = [
    { code: 'ALL', name: 'Todos' },
    { code: 'FAV', name: 'Favoritos' },
    { code: 'BSA', name: 'Brasileirão' },
    { code: 'CL', name: 'Champions' },
    { code: 'PD', name: 'La Liga' },
    { code: 'FINISHED', name: 'Finalizados' },
  ];

  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['rgba(34, 197, 94, 0.1)', 'transparent']}
        style={styles.headerGradient}
      />
      
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
          <View style={styles.titleContainer}>
            <Text style={styles.titleHighlight}>Fut</Text>
            <Text style={styles.title}>Score</Text>
            <View style={styles.liveDotHeader} />
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
        >
           <LinearGradient
             colors={['#2a2a2a', '#1a1a1a']}
             style={styles.profileGradient}
           >
             <Text style={{ fontSize: 20 }}>👤</Text>
           </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelectorWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateSelectorContainer}
        >
          {dates.map((date, index) => {
            const isSelected = date.getDate() === selectedDate.getDate() && 
                             date.getMonth() === selectedDate.getMonth();
            const isDateToday = isToday(date);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateButton,
                  isSelected && styles.dateButtonActive
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Text style={[
                  styles.dateDayText,
                  isSelected && styles.dateTextActive
                ]}>
                  {isDateToday ? 'HOJE' : date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '')}
                </Text>
                <Text style={[
                  styles.dateNumberText,
                  isSelected && styles.dateTextActive
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      {/* Favorites Button - Centered */}
      <View style={styles.favoritesButtonContainer}>
        <TouchableOpacity 
          style={styles.favoritesButtonCentered}
          onPress={() => navigation.navigate('TeamSelection')}
          activeOpacity={0.8}
        >
           <LinearGradient
             colors={['#22c55e', '#16a34a']}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 1 }}
             style={styles.favoritesGradient}
           >
             <Text style={styles.favoritesIcon}>⭐</Text>
             <Text style={styles.favoritesText}>Times Favoritos</Text>
           </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {/* League Selector */}
      <View style={styles.leagueSelectorWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueSelectorContainer}
        >
          {leagues.map((league) => (
            <TouchableOpacity
              key={league.code}
              style={[
                styles.leagueButton,
                selectedLeague === league.code && styles.leagueButtonActive
              ]}
              onPress={() => setSelectedLeague(league.code)}
              activeOpacity={0.8}
            >
              {selectedLeague === league.code && (
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text style={[
                styles.leagueButtonText,
                selectedLeague === league.code && styles.leagueButtonTextActive
              ]}>
                {league.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* System Warnings */}
      {warnings.map(warning => (
        <WarningCard
          key={warning._id}
          title={warning.title}
          message={warning.message}
          type={warning.type}
        />
      ))}
    </View>
  );

  // Filter matches by selected league
  const filteredMatches = (() => {
    let matches = [];
    const sourceMatches = isToday(selectedDate) ? [...liveMatches, ...todaysMatches] : customMatches;

    if (selectedLeague === 'ALL') {
      matches = sourceMatches;
    } else if (selectedLeague === 'FAV') {
      matches = sourceMatches.filter(m => 
        favoriteTeams.includes(m.teams.home.id) || favoriteTeams.includes(m.teams.away.id)
      );
    } else if (selectedLeague === 'FINISHED') {
      matches = sourceMatches.filter(m => 
        ['FT', 'AET', 'PEN'].includes(m.fixture.status.short)
      );
    } else {
      matches = sourceMatches.filter(m => m.league.id === selectedLeague);
    }

    // Deduplicate matches and ensure valid ID
    const uniqueMatches = Array.from(
      new Map(
        matches
          .filter(item => item?.fixture?.id)
          .map(item => [item.fixture.id, item])
      ).values()
    );
    return uniqueMatches;
  })();

  // Group matches
  const finishedMatches = filteredMatches.filter(m => ['FT', 'AET', 'PEN'].includes(m.fixture.status.short));
  const scheduledMatches = filteredMatches.filter(m => ['NS', 'TBD', 'TIMED'].includes(m.fixture.status.short));
  const live = filteredMatches.filter(m => ['1H', '2H', 'HT'].includes(m.fixture.status.short));

  const sections = [
    { title: 'AO VIVO', data: live, type: 'live' },
    { title: 'Agendados', data: scheduledMatches, type: 'scheduled' },
    { title: 'Finalizados', data: finishedMatches, type: 'finished' },
  ].filter(section => section.data.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <LinearGradient
        colors={['#09090b', '#18181b', '#09090b']}
        style={styles.background}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                 {item.type === 'live' && (
                   <View style={styles.liveIndicatorContainer}>
                     <View style={styles.pulsingDot} />
                   </View>
                 )}
                 <Text style={[styles.sectionTitle, item.type === 'live' && styles.liveTitle]}>
                   {item.title}
                 </Text>
                 <View style={styles.sectionLine} />
              </View>
              {item.data.map(match => (
                <MatchCard key={`${item.type}-${match.fixture.id}`} match={match} />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshMatches} tintColor="#22c55e" />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Text style={styles.emptyIcon}>⚽</Text>
                </View>
                <Text style={styles.emptyTitle}>Nenhum Jogo Encontrado</Text>
                <Text style={styles.emptyText}>
                  Não há partidas para a seleção atual.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      {updateInfo && (
        <UpdateModal
          visible={showUpdateModal}
          version={updateInfo.version}
          downloadLink={updateInfo.downloadLink}
          forceUpdate={updateInfo.forceUpdate}
          notes={updateInfo.notes}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              style={styles.profileModalGradient}
            >
              <View style={styles.profileModalHeader}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {user?.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.profileName}>{user?.name || 'Usuário'}</Text>
                <Text style={styles.profileEmail}>{user?.email || ''}</Text>
              </View>

              <View style={styles.profileModalDivider} />

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  setShowProfileModal(false);
                  Alert.alert(
                    'Sair da Conta',
                    'Tem certeza que deseja sair?',
                    [
                      {
                        text: 'Cancelar',
                        style: 'cancel',
                      },
                      {
                        text: 'Sair',
                        style: 'destructive',
                        onPress: async () => {
                          await signOut();
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoutGradient}
                >
                  <Text style={styles.logoutIcon}>🚪</Text>
                  <Text style={styles.logoutText}>Sair da Conta</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.closeModalText}>Fechar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  headerContainer: {
    marginBottom: 32,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 10,
    position: 'relative',
  },
  headerGradient: {
    position: 'absolute',
    top: -100,
    left: -20,
    right: -20,
    height: 200,
    opacity: 0.5,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  dateText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '700',
    // letterSpacing: 1.5, // Removed to prevent truncation
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleHighlight: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  liveDotHeader: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginLeft: 4,
    marginBottom: 6,
  },
  favoritesButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  favoritesButtonCentered: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  favoritesButton: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  favoritesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  favoritesIcon: {
    fontSize: 16,
  },
  favoritesText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  profileGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  profileModalGradient: {
    padding: 24,
  },
  profileModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  profileModalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  logoutButton: {
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeModalButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeModalText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },

  dateSelectorWrapper: {
    marginBottom: 20,
    marginHorizontal: -4,
  },
  dateSelectorContainer: {
    paddingHorizontal: 4,
  },
  dateButton: {
    width: 56,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  dateButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: 'transparent',
  },
  dateDayText: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateNumberText: {
    color: '#e4e4e7',
    fontSize: 18,
    fontWeight: '800',
  },
  dateTextActive: {
    color: '#fff',
  },

  leagueSelectorWrapper: {
    marginHorizontal: -4,
  },
  leagueSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    padding: 4,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    minWidth: '100%', // Ensure it takes full width if content is small
  },
  leagueButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 34,
    overflow: 'hidden',
    position: 'relative',
  },
  leagueButtonActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  leagueButtonText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
    zIndex: 1,
  },
  leagueButtonTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e4e4e7',
    letterSpacing: 0.5,
    marginRight: 12,
  },
  liveTitle: {
    color: '#22c55e',
  },
  liveIndicatorContainer: {
    marginRight: 8,
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22c55e',
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 4,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },
});
