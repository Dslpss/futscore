import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { msnSportsApi } from '../services/msnSportsApi';
import { MsnLeague } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 columns with padding

export const LeaguesExplorer = ({ navigation }: any) => {
  const [leagues, setLeagues] = useState<MsnLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<MsnLeague | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [entityHeader, setEntityHeader] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      const data = await msnSportsApi.getPersonalizationStrip();
      
      // Adiciona ligas que NÃO vêm da API mas são importantes
      // Brasileirão Série A
      const hasBrasileiro = data.some(l => l.sportWithLeague === 'Soccer_BrazilBrasileiroSerieA');
      if (!hasBrasileiro) {
        data.unshift({
          id: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilBrasileiroSerieA',
          name: { rawName: 'Brasileirão Série A', localizedName: 'Brasileirão Série A' },
          image: { id: 'OSB.DDCIoVn_Dv2xaAEGEFXsOg--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/brasileirao/calendario', leagueHome: 'esportes/futebol/brasileirao' },
        } as MsnLeague);
      }

      // Copa do Brasil
      const hasCopaDoBrasil = data.some(l => l.sportWithLeague === 'Soccer_BrazilCopaDoBrasil');
      if (!hasCopaDoBrasil) {
        data.unshift({
          id: 'SportRadar_Soccer_BrazilCopaDoBrasil_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilCopaDoBrasil',
          name: { rawName: 'Copa do Brasil', localizedName: 'Copa do Brasil' },
          image: { id: 'OSB.eU2p2A|8WHaLXvGHBFf8dg--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/copa_do_brasil/calendario', leagueHome: 'esportes/futebol/copa_do_brasil' },
        } as MsnLeague);
      }

      // Champions League
      const hasChampions = data.some(l => l.sportWithLeague === 'Soccer_InternationalClubsUEFAChampionsLeague');
      if (!hasChampions) {
        data.unshift({
          id: 'SportRadar_Soccer_InternationalClubsUEFAChampionsLeague_2025',
          sport: 'soccer',
          sportWithLeague: 'Soccer_InternationalClubsUEFAChampionsLeague',
          name: { rawName: 'UEFA Champions League', localizedName: 'Champions League' },
          image: { id: 'OSB.hEhM6WADcDogo9SjjiSqPg--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/champions_league/calendario', leagueHome: 'esportes/futebol/champions_league' },
        } as MsnLeague);
      }

      // Europa League
      const hasEuropaLeague = data.some(l => l.sportWithLeague === 'Soccer_UEFAEuropaLeague');
      if (!hasEuropaLeague) {
        data.unshift({
          id: 'SportRadar_Soccer_UEFAEuropaLeague_2025',
          sport: 'soccer',
          sportWithLeague: 'Soccer_UEFAEuropaLeague',
          name: { rawName: 'UEFA Europa League', localizedName: 'Europa League' },
          image: { id: 'OSB._KnLnyVvH59xImdTB_HaIw--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/europa_league/calendario', leagueHome: 'esportes/futebol/europa_league' },
        } as MsnLeague);
      }

      // Copa Intercontinental (Copa do Mundo de Clubes formato antigo)
      const hasIntercontinental = data.some(l => l.sportWithLeague === 'Soccer_FIFAIntercontinentalCup');
      if (!hasIntercontinental) {
        data.push({
          id: 'SportRadar_Soccer_FIFAIntercontinentalCup_2025',
          sport: 'soccer',
          sportWithLeague: 'Soccer_FIFAIntercontinentalCup',
          name: { rawName: 'FIFA Intercontinental Cup', localizedName: 'Copa Intercontinental' },
          image: { id: 'OSB.FIC_logo.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/copa_intercontinental/calendario', leagueHome: 'esportes/futebol/copa_intercontinental' },
        } as MsnLeague);
      }
      
      // Adiciona Campeonato Carioca se não estiver na lista
      const hasCarioca = data.some(l => l.sportWithLeague === 'Soccer_BrazilCarioca');
      if (!hasCarioca) {
        const cariocaLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilCarioca_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilCarioca',
          name: {
            rawName: 'Carioca, Serie A',
            localizedName: 'Campeonato Carioca',
          },
          image: {
            id: 'OSB.EZe70_mp5lqhJ0Py5juOgA--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_carioca/calendario',
            leagueHome: 'esportes/futebol/campeonato_carioca',
          },
        };
        data.push(cariocaLeague);
      }

      // Adiciona Campeonato Mineiro se não estiver na lista
      const hasMineiro = data.some(l => l.sportWithLeague === 'Soccer_BrazilMineiro');
      if (!hasMineiro) {
        const mineiroLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilMineiro_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilMineiro',
          name: {
            rawName: 'Mineiro, Modulo I',
            localizedName: 'Campeonato Mineiro',
          },
          image: {
            id: 'OSB.AQypHhNwDa8NWPcVeBX8JA--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_mineiro/calendario',
            leagueHome: 'esportes/futebol/campeonato_mineiro',
          },
        };
        data.push(mineiroLeague);
      }

      // Adiciona Campeonato Paulista se não estiver na lista
      const hasPaulista = data.some(l => l.sportWithLeague === 'Soccer_BrazilPaulistaSerieA1');
      if (!hasPaulista) {
        const paulistaLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilPaulistaSerieA1_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilPaulistaSerieA1',
          name: {
            rawName: 'Paulista, Serie A1',
            localizedName: 'Campeonato Paulista',
          },
          image: {
            id: 'OSB.nc1SdrFhr_iRsfehpGKRrQ--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_paulista/calendario',
            leagueHome: 'esportes/futebol/campeonato_paulista',
          },
        };
        data.push(paulistaLeague);
      }

      // Adiciona Campeonato Gaúcho se não estiver na lista
      const hasGaucho = data.some(l => l.sportWithLeague === 'Soccer_BrazilGaucho');
      if (!hasGaucho) {
        const gauchoLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilGaucho_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilGaucho',
          name: {
            rawName: 'Gaucho, Serie A1',
            localizedName: 'Campeonato Gaúcho',
          },
          image: {
            id: 'OSB.ZkNO8eZsdqmMWmkJWegsWg--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_gaucho/calendario',
            leagueHome: 'esportes/futebol/campeonato_gaucho',
          },
        };
        data.push(gauchoLeague);
      }
      
      // Filtrar NBA (app é só futebol)
      const filteredData = data.filter(l => !l.sportWithLeague.toLowerCase().includes('basketball') && !l.sportWithLeague.toLowerCase().includes('nba'));
      
      setLeagues(filteredData);
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await msnSportsApi.clearCache();
      const data = await msnSportsApi.getPersonalizationStrip();
      
      // Adiciona ligas que NÃO vêm da API mas são importantes
      // Brasileirão Série A
      const hasBrasileiro = data.some(l => l.sportWithLeague === 'Soccer_BrazilBrasileiroSerieA');
      if (!hasBrasileiro) {
        data.unshift({
          id: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilBrasileiroSerieA',
          name: { rawName: 'Brasileirão Série A', localizedName: 'Brasileirão Série A' },
          image: { id: 'OSB.DDCIoVn_Dv2xaAEGEFXsOg--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/brasileirao/calendario', leagueHome: 'esportes/futebol/brasileirao' },
        } as MsnLeague);
      }

      // Copa do Brasil
      const hasCopaDoBrasil = data.some(l => l.sportWithLeague === 'Soccer_BrazilCopaDoBrasil');
      if (!hasCopaDoBrasil) {
        data.unshift({
          id: 'SportRadar_Soccer_BrazilCopaDoBrasil_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilCopaDoBrasil',
          name: { rawName: 'Copa do Brasil', localizedName: 'Copa do Brasil' },
          image: { id: 'OSB.eU2p2A|8WHaLXvGHBFf8dg--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/copa_do_brasil/calendario', leagueHome: 'esportes/futebol/copa_do_brasil' },
        } as MsnLeague);
      }

      // Champions League
      const hasChampions = data.some(l => l.sportWithLeague === 'Soccer_InternationalClubsUEFAChampionsLeague');
      if (!hasChampions) {
        data.unshift({
          id: 'SportRadar_Soccer_InternationalClubsUEFAChampionsLeague_2025',
          sport: 'soccer',
          sportWithLeague: 'Soccer_InternationalClubsUEFAChampionsLeague',
          name: { rawName: 'UEFA Champions League', localizedName: 'Champions League' },
          image: { id: 'OSB.hEhM6WADcDogo9SjjiSqPg--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/champions_league/calendario', leagueHome: 'esportes/futebol/champions_league' },
        } as MsnLeague);
      }

      // Europa League
      const hasEuropaLeague = data.some(l => l.sportWithLeague === 'Soccer_UEFAEuropaLeague');
      if (!hasEuropaLeague) {
        data.unshift({
          id: 'SportRadar_Soccer_UEFAEuropaLeague_2025',
          sport: 'soccer',
          sportWithLeague: 'Soccer_UEFAEuropaLeague',
          name: { rawName: 'UEFA Europa League', localizedName: 'Europa League' },
          image: { id: 'OSB._KnLnyVvH59xImdTB_HaIw--.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/europa_league/calendario', leagueHome: 'esportes/futebol/europa_league' },
        } as MsnLeague);
      }

      // Copa Intercontinental
      const hasIntercontinental = data.some(l => l.sportWithLeague === 'Soccer_FIFAIntercontinentalCup');
      if (!hasIntercontinental) {
        data.push({
          id: 'SportRadar_Soccer_FIFAIntercontinentalCup_2025',
          sport: 'soccer',
          sportWithLeague: 'Soccer_FIFAIntercontinentalCup',
          name: { rawName: 'FIFA Intercontinental Cup', localizedName: 'Copa Intercontinental' },
          image: { id: 'OSB.FIC_logo.png' },
          secondaryIds: [],
          navUrls: { schedule: 'esportes/futebol/copa_intercontinental/calendario', leagueHome: 'esportes/futebol/copa_intercontinental' },
        } as MsnLeague);
      }
      
      // Adiciona Campeonato Carioca se não estiver na lista
      const hasCarioca = data.some(l => l.sportWithLeague === 'Soccer_BrazilCarioca');
      if (!hasCarioca) {
        const cariocaLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilCarioca_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilCarioca',
          name: {
            rawName: 'Carioca, Serie A',
            localizedName: 'Campeonato Carioca',
          },
          image: {
            id: 'OSB.EZe70_mp5lqhJ0Py5juOgA--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_carioca/calendario',
            leagueHome: 'esportes/futebol/campeonato_carioca',
          },
        };
        data.push(cariocaLeague);
      }

      // Adiciona Campeonato Mineiro se não estiver na lista
      const hasMineiro = data.some(l => l.sportWithLeague === 'Soccer_BrazilMineiro');
      if (!hasMineiro) {
        const mineiroLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilMineiro_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilMineiro',
          name: {
            rawName: 'Mineiro, Modulo I',
            localizedName: 'Campeonato Mineiro',
          },
          image: {
            id: 'OSB.AQypHhNwDa8NWPcVeBX8JA--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_mineiro/calendario',
            leagueHome: 'esportes/futebol/campeonato_mineiro',
          },
        };
        data.push(mineiroLeague);
      }

      // Adiciona Campeonato Paulista se não estiver na lista
      const hasPaulista = data.some(l => l.sportWithLeague === 'Soccer_BrazilPaulistaSerieA1');
      if (!hasPaulista) {
        const paulistaLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilPaulistaSerieA1_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilPaulistaSerieA1',
          name: {
            rawName: 'Paulista, Serie A1',
            localizedName: 'Campeonato Paulista',
          },
          image: {
            id: 'OSB.nc1SdrFhr_iRsfehpGKRrQ--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_paulista/calendario',
            leagueHome: 'esportes/futebol/campeonato_paulista',
          },
        };
        data.push(paulistaLeague);
      }

      // Adiciona Campeonato Gaúcho se não estiver na lista
      const hasGaucho = data.some(l => l.sportWithLeague === 'Soccer_BrazilGaucho');
      if (!hasGaucho) {
        const gauchoLeague: MsnLeague = {
          id: 'SportRadar_Soccer_BrazilGaucho_2026',
          sport: 'soccer',
          sportWithLeague: 'Soccer_BrazilGaucho',
          name: {
            rawName: 'Gaucho, Serie A1',
            localizedName: 'Campeonato Gaúcho',
          },
          image: {
            id: 'OSB.ZkNO8eZsdqmMWmkJWegsWg--.png',
          },
          secondaryIds: [],
          navUrls: {
            schedule: 'esportes/futebol/campeonato_gaucho/calendario',
            leagueHome: 'esportes/futebol/campeonato_gaucho',
          },
        };
        data.push(gauchoLeague);
      }
      
      // Filtrar NBA (app é só futebol)
      const filteredData = data.filter(l => !l.sportWithLeague.toLowerCase().includes('basketball') && !l.sportWithLeague.toLowerCase().includes('nba'));
      
      setLeagues(filteredData);
    } catch (error) {
      console.error('Error refreshing leagues:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderLeagueCard = ({ item }: { item: MsnLeague }) => {
    // Determine sport icon
    const getSportIcon = (sport: string) => {
      if (sport.toLowerCase().includes('basketball') || item.name.localizedName.includes('NBA')) {
        return '🏀';
      }
      return '⚽';
    };

    // Get image URL
    const imageUrl = msnSportsApi.getLeagueImageUrl(item.image.id);

    return (
      <TouchableOpacity 
        style={styles.leagueCard}
        activeOpacity={0.8}
        onPress={async () => {
          setSelectedLeague(item);
          setShowModal(true);
          setLoadingDetails(true);
          setEntityHeader(null);
          
          // Load detailed information
          const details = await msnSportsApi.getEntityHeader(item.sportWithLeague);
          setEntityHeader(details);
          setLoadingDetails(false);
        }}
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* League Icon/Image */}
          <View style={styles.iconContainer}>
            {imageUrl ? (
              <Image 
                source={{ uri: imageUrl }}
                style={styles.leagueImage}
                defaultSource={require('../../assets/icon.png')}
              />
            ) : (
              <Text style={styles.sportIcon}>{getSportIcon(item.sport)}</Text>
            )}
          </View>

          {/* League Name */}
          <View style={styles.leagueInfo}>
            <Text style={styles.leagueName} numberOfLines={2}>
              {item.name.localizedName}
            </Text>
            <Text style={styles.sportType}>
              {item.sport === 'unknown' ? 'Futebol' : item.sport}
            </Text>
          </View>

          {/* Indicator */}
          <View style={styles.indicatorContainer}>
            <View style={styles.indicator} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          style={styles.backButtonGradient}
        >
          <Text style={styles.backIcon}>←</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>Explorar Ligas</Text>
        <Text style={styles.headerSubtitle}>
          {leagues.length} competições disponíveis
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#09090b', '#18181b', '#09090b']}
          style={styles.background}
        />
        <StatusBar barStyle="light-content" backgroundColor="#09090b" />
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Carregando ligas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <LinearGradient
        colors={['#09090b', '#18181b', '#09090b']}
        style={styles.background}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        
        <FlatList
          data={leagues}
          renderItem={renderLeagueCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#22c55e" 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>Nenhuma Liga Encontrada</Text>
              <Text style={styles.emptyText}>
                Não foi possível carregar as ligas. Tente novamente.
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* League Details Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              style={styles.modalGradient}
            >
              {selectedLeague && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalIconContainer}>
                      <Text style={styles.modalIcon}>
                        {selectedLeague.sportWithLeague.includes('Basketball') ? '🏀' : '⚽'}
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedLeague.name.localizedName}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedLeague.sport === 'unknown' ? 'Futebol' : selectedLeague.sport}
                    </Text>
                  </View>

                  <View style={styles.modalDivider} />

                  {loadingDetails ? (
                    <View style={styles.loadingDetailsContainer}>
                      <ActivityIndicator size="small" color="#22c55e" />
                      <Text style={styles.loadingDetailsText}>Carregando detalhes...</Text>
                    </View>
                  ) : entityHeader ? (
                    <>
                      <View style={styles.modalInfo}>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Temporada:</Text>
                          <Text style={styles.infoValue}>
                            {entityHeader.league?.seasonYear || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Fase:</Text>
                          <Text style={styles.infoValue} numberOfLines={1}>
                            {entityHeader.league?.currentSeasonPhase === 'RegularSeason' ? 'Temporada Regular' : entityHeader.league?.currentSeasonPhase || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalDivider} />

                      <View style={styles.featuresContainer}>
                        <Text style={styles.featuresTitle}>Recursos Disponíveis:</Text>
                        
                        {entityHeader.league?.isRegularSeasonScheduleAvailable && (
                          <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>📅</Text>
                            <Text style={styles.featureText}>Calendário de Jogos</Text>
                          </View>
                        )}
                        
                        {entityHeader.league?.isRegularSeasonStandingsAvailable && (
                          <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>🏆</Text>
                            <Text style={styles.featureText}>Classificação</Text>
                          </View>
                        )}
                        
                        {entityHeader.league?.isPlayerStatisticsAvailable && (
                          <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>📊</Text>
                            <Text style={styles.featureText}>Estatísticas de Jogadores</Text>
                          </View>
                        )}

                        {entityHeader.league?.isRegularSeasonStatisticsAvailable && (
                          <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>📈</Text>
                            <Text style={styles.featureText}>Estatísticas da Liga</Text>
                          </View>
                        )}
                      </View>
                    </>
                  ) : (
                    <View style={styles.modalInfo}>
                      <Text style={styles.noDetailsText}>
                        Não foi possível carregar os detalhes desta liga.
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setShowModal(false);
                      setEntityHeader(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.closeButtonGradient}
                    >
                      <Text style={styles.closeButtonText}>Fechar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  loadingText: {
    color: '#e4e4e7',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  leagueCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sportIcon: {
    fontSize: 28,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 20,
  },
  sportType: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  indicatorContainer: {
    alignItems: 'flex-end',
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#22c55e',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e4e4e7',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
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
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  modalInfo: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  closeButton: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingDetailsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDetailsText: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#e4e4e7',
    fontWeight: '600',
  },
  noDetailsText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    padding: 20,
  },
});
