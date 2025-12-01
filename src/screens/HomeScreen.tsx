import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, StatusBar, TouchableOpacity, Dimensions, Platform, ScrollView } from 'react-native';
import { useMatches } from '../context/MatchContext';
import { useFavorites } from '../context/FavoritesContext';
import { MatchCard } from '../components/MatchCard';
import { LinearGradient } from 'expo-linear-gradient';
import { WarningCard } from '../components/WarningCard';
import { UpdateModal } from '../components/UpdateModal';
import axios from 'axios';

const { width } = Dimensions.get('window');

interface Warning {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
}

export const HomeScreen = () => {
  const { liveMatches, todaysMatches, loading, refreshMatches } = useMatches();
  const { favoriteTeams } = useFavorites();
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    fetchWarnings();
    checkUpdate();
  }, []);

  const fetchWarnings = async () => {
    try {
      const response = await axios.get('http://192.168.100.54:5000/admin/warnings');
      setWarnings(response.data);
    } catch (error) {
      console.error('Error fetching warnings', error);
    }
  };

  const checkUpdate = async () => {
    try {
      const response = await axios.get('http://192.168.100.54:5000/admin/version');
      const latestVersion = response.data;
      const currentVersion = '1.0.0';

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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['rgba(34, 197, 94, 0.1)', 'transparent']}
        style={styles.headerGradient}
      />
      
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
          <View style={styles.titleContainer}>
            <Text style={styles.titleHighlight}>Fut</Text>
            <Text style={styles.title}>Score</Text>
            <View style={styles.liveDotHeader} />
          </View>
        </View>
        
        <TouchableOpacity style={styles.profileButton}>
           <LinearGradient
             colors={['#2a2a2a', '#1a1a1a']}
             style={styles.profileGradient}
           >
             <Text style={{ fontSize: 24 }}>⚽</Text>
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
    </View>
  );

  // Filter matches by selected league
  const filteredMatches = (() => {
    let matches = [];
    if (selectedLeague === 'ALL') {
      matches = [...liveMatches, ...todaysMatches];
    } else if (selectedLeague === 'FAV') {
      matches = [...liveMatches, ...todaysMatches].filter(m => 
        favoriteTeams.includes(m.teams.home.id) || favoriteTeams.includes(m.teams.away.id)
      );
    } else if (selectedLeague === 'FINISHED') {
      matches = [...liveMatches, ...todaysMatches].filter(m => 
        ['FT', 'AET', 'PEN'].includes(m.fixture.status.short)
      );
    } else {
      matches = [...liveMatches, ...todaysMatches].filter(m => m.league.id === selectedLeague);
    }

    // Deduplicate matches
    const uniqueMatches = Array.from(new Map(matches.map(item => [item.fixture.id, item])).values());
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
        {warnings.map(warning => (
          <WarningCard
            key={warning._id}
            title={warning.title}
            message={warning.message}
            type={warning.type}
          />
        ))}
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
                <MatchCard key={match.fixture.id} match={match} />
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
