import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { authApi, FavoriteTeam } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { TeamCard } from '../components/TeamCard';
import { TeamDetailsModal } from '../components/TeamDetailsModal';

interface TeamWithCountry {
  id: number;
  name: string;
  logo: string;
  country: string;
}

export const TeamSelectionScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [teams, setTeams] = useState<TeamWithCountry[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithCountry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const leagues = [
    { code: 'all', name: 'Todas' },
    { code: 'favorites', name: 'Favoritos' },
    { code: 'BSA', name: 'Brasileirão' },
    { code: 'CL', name: 'Champions' },
    { code: 'PD', name: 'La Liga' },
    { code: 'PL', name: 'Premier League' },
    { code: 'BL1', name: 'Bundesliga' },
    { code: 'SA', name: 'Serie A' },
    { code: 'FL1', name: 'Ligue 1' },
    { code: 'PPL', name: 'Liga Portugal' },
    { code: 'NBA', name: 'NBA' },
  ];

  useEffect(() => {
    if (user) {
      loadFavoriteTeams();
    }
    loadAllTeams();
  }, [user]);

  const loadFavoriteTeams = async () => {
    try {
      const favorites = await authApi.getFavoriteTeams();
      setFavoriteTeams(favorites);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      if (error.message.includes('401') || error.message.includes('authorization denied')) {
          Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.');
          signOut();
          navigation.goBack();
      }
    }
  };

  const loadAllTeams = async () => {
    setLoading(true);
    try {
      // 1. Load teams from football-data.org
      const footballDataCodes = ['BSA', 'CL', 'PD'];
      let allTeams: TeamWithCountry[] = [];

      for (const code of footballDataCodes) {
        const leagueTeams = await api.getTeamsByLeague(code);
        const leagueInfo = await api.getLeagues();
        const league = leagueInfo.find(l => l.id === code);
        
        const teamsWithCountry = leagueTeams.map(team => ({
          ...team,
          country: league?.country || 'Unknown',
        }));

        allTeams = [...allTeams, ...teamsWithCountry];
      }

      // 2. Load teams from MSN Sports API (extract from matches)
      const { msnSportsApi } = await import('../services/msnSportsApi');
      
      const msnLeagues = [
        { id: 'Soccer_EnglandPremierLeague', sport: 'Soccer', name: 'PL', country: 'England' },
        { id: 'Soccer_GermanyBundesliga', sport: 'Soccer', name: 'BL1', country: 'Germany' },
        { id: 'Soccer_ItalySerieA', sport: 'Soccer', name: 'SA', country: 'Italy' },
        { id: 'Soccer_FranceLigue1', sport: 'Soccer', name: 'FL1', country: 'France' },
        { id: 'Soccer_PortugalPrimeiraLiga', sport: 'Soccer', name: 'PPL', country: 'Portugal' },
        { id: 'Basketball_NBA', sport: 'Basketball', name: 'NBA', country: 'USA' },
      ];

      for (const league of msnLeagues) {
        try {
          const games = await msnSportsApi.getLiveAroundLeague(league.id, league.sport);
          
          // Extract unique teams from games
          const teamsSet = new Map<number, TeamWithCountry>();
          
          games.forEach((game: any) => {
            game.participants?.forEach((participant: any) => {
              const team = participant.team;
              if (team && team.id) {
                const teamId = parseInt(team.id.split('_').pop() || '0');
                const teamName = team.name?.localizedName || team.name?.rawName || 'Unknown';
                const teamLogo = team.image?.id ? `https://www.bing.com/th?id=${team.image.id}&w=80&h=80` : '';
                
                if (!teamsSet.has(teamId)) {
                  teamsSet.set(teamId, {
                    id: teamId,
                    name: teamName,
                    logo: teamLogo,
                    country: league.country,
                  });
                }
              }
            });
          });
          
          allTeams = [...allTeams, ...Array.from(teamsSet.values())];
        } catch (error) {
          console.error(`Error loading teams from ${league.name}:`, error);
        }
      }

      // Deduplicate teams by ID
      const uniqueTeams = Array.from(
          new Map(allTeams.map(team => [team.id, team])).values()
      );

      setTeams(uniqueTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Erro', 'Não foi possível carregar os times');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      loadAllTeams();
      return;
    }

    setLoading(true);
    try {
      const leagueCodes = selectedLeague === 'all' 
        ? ['BSA', 'CL', 'PD', 'PL', 'BL1', 'SA', 'FL1', 'PPL', 'NBA'] 
        : [selectedLeague];
      
      const results = await api.searchTeams(query, leagueCodes);
      setTeams(results);
    } catch (error) {
      console.error('Error searching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueFilter = async (leagueCode: string) => {
    setSelectedLeague(leagueCode);
    setLoading(true);
    
    try {
      if (leagueCode === 'all') {
        await loadAllTeams();
      } else if (leagueCode === 'favorites') {
        setTeams(favoriteTeams);
      } else {
        // Check if it's a football-data league or MSN league
        const footballDataLeagues = ['BSA', 'CL', 'PD'];
        const msnLeagueMap: Record<string, { id: string; sport: string; country: string }> = {
          'PL': { id: 'Soccer_EnglandPremierLeague', sport: 'Soccer', country: 'England' },
          'BL1': { id: 'Soccer_GermanyBundesliga', sport: 'Soccer', country: 'Germany' },
          'SA': { id: 'Soccer_ItalySerieA', sport: 'Soccer', country: 'Italy' },
          'FL1': { id: 'Soccer_FranceLigue1', sport: 'Soccer', country: 'France' },
          'PPL': { id: 'Soccer_PortugalPrimeiraLiga', sport: 'Soccer', country: 'Portugal' },
          'NBA': { id: 'Basketball_NBA', sport: 'Basketball', country: 'USA' },
        };
        
        if (footballDataLeagues.includes(leagueCode)) {
          // Load from football-data.org
          const leagueTeams = await api.getTeamsByLeague(leagueCode);
          const leagueInfo = await api.getLeagues();
          const league = leagueInfo.find(l => l.id === leagueCode);
          
          const teamsWithCountry = leagueTeams.map(team => ({
            ...team,
            country: league?.country || 'Unknown',
          }));
          
          setTeams(teamsWithCountry);
        } else if (msnLeagueMap[leagueCode]) {
          // Load from MSN Sports
          const { msnSportsApi } = await import('../services/msnSportsApi');
          const msnLeague = msnLeagueMap[leagueCode];
          
          const games = await msnSportsApi.getLiveAroundLeague(msnLeague.id, msnLeague.sport);
          
          // Extract unique teams from games
          const teamsSet = new Map<number, TeamWithCountry>();
          
          games.forEach((game: any) => {
            game.participants?.forEach((participant: any) => {
              const team = participant.team;
              if (team && team.id) {
                const teamId = parseInt(team.id.split('_').pop() || '0');
                const teamName = team.name?.localizedName || team.name?.rawName || 'Unknown';
                const teamLogo = team.image?.id ? `https://www.bing.com/th?id=${team.image.id}&w=80&h=80` : '';
                
                if (!teamsSet.has(teamId)) {
                  teamsSet.set(teamId, {
                    id: teamId,
                    name: teamName,
                    logo: teamLogo,
                    country: msnLeague.country,
                  });
                }
              }
            });
          });
          
          setTeams(Array.from(teamsSet.values()));
        }
      }
    } catch (error) {
      console.error('Error filtering teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (team: TeamWithCountry) => {
    const isFavorite = favoriteTeams.some(fav => fav.id === team.id);
    
    if (isFavorite) {
      setFavoriteTeams(favoriteTeams.filter(fav => fav.id !== team.id));
    } else {
      setFavoriteTeams([...favoriteTeams, team]);
    }
  };

  const saveFavorites = async () => {
    setSaving(true);
    try {
      await authApi.saveFavoriteTeams(favoriteTeams);
      Alert.alert('Sucesso', 'Times favoritos salvos com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving favorites:', error);
      Alert.alert('Erro', 'Não foi possível salvar os times favoritos');
    } finally {
      setSaving(false);
    }
  };

  const handleTeamPress = (team: TeamWithCountry) => {
    setSelectedTeam(team);
    setModalVisible(true);
  };

  const filteredTeams = teams;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus Times</Text>
          <TouchableOpacity 
            onPress={saveFavorites} 
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar times..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* League Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={leagues}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedLeague === item.code && styles.filterButtonActive,
                ]}
                onPress={() => handleLeagueFilter(item.code)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedLeague === item.code && styles.filterButtonTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Favorite Count */}
        <View style={styles.favoriteCount}>
          <Ionicons name="heart" size={16} color="#FF6B6B" />
          <Text style={styles.favoriteCountText}>
            {favoriteTeams.length} {favoriteTeams.length === 1 ? 'time selecionado' : 'times selecionados'}
          </Text>
        </View>

        {/* Teams Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Carregando times...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTeams}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TeamCard
                team={item}
                isFavorite={favoriteTeams.some(fav => fav.id === item.id)}
                onToggleFavorite={() => toggleFavorite(item)}
                onPress={() => handleTeamPress(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="football-outline" size={64} color="#888" />
                <Text style={styles.emptyText}>Nenhum time encontrado</Text>
              </View>
            }
          />
        )}

        <TeamDetailsModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          team={selectedTeam}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  filterContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  favoriteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  favoriteCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
});
