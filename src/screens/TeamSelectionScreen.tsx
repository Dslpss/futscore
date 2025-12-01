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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { authApi, FavoriteTeam } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { TeamCard } from '../components/TeamCard';

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

  const leagues = [
    { code: 'all', name: 'Todas' },
    { code: 'BSA', name: 'Brasileirão' },
    { code: 'CL', name: 'Champions' },
    { code: 'PD', name: 'La Liga' },
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
      const leagueCodes = ['BSA', 'CL', 'PD'];
      let allTeams: TeamWithCountry[] = [];

      for (const code of leagueCodes) {
        const leagueTeams = await api.getTeamsByLeague(code);
        const leagueInfo = await api.getLeagues();
        const league = leagueInfo.find(l => l.id === code);
        
        const teamsWithCountry = leagueTeams.map(team => ({
          ...team,
          country: league?.country || 'Unknown',
        }));

        allTeams = [...allTeams, ...teamsWithCountry];
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
        ? ['BSA', 'CL', 'PD'] 
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
      } else {
        const leagueTeams = await api.getTeamsByLeague(leagueCode);
        const leagueInfo = await api.getLeagues();
        const league = leagueInfo.find(l => l.id === leagueCode);
        
        const teamsWithCountry = leagueTeams.map(team => ({
          ...team,
          country: league?.country || 'Unknown',
        }));
        
        setTeams(teamsWithCountry);
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
