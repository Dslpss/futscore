// RadiosScreen - Main screen for listing and playing radio stations
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radio as RadioIcon, Search, MapPin, X, ArrowLeft } from 'lucide-react-native';
import { RadioCard } from '../components/RadioCard';
import { RadioPlayerModal } from '../components/RadioPlayerModal';
import { radioApi } from '../services/radioApi';
import { Radio } from '../types/radio';

const STATES = [
  { code: 'ALL', name: 'Todos' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'BA', name: 'Bahia' },
];

export const RadiosScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedState, setSelectedState] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRadio, setSelectedRadio] = useState<Radio | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  const allRadios = useMemo(() => radioApi.getAllRadios(), []);

  const filteredRadios = useMemo(() => {
    let radios = allRadios;

    // Filter by state
    if (selectedState !== 'ALL') {
      radios = radios.filter(r => r.state === selectedState);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      radios = radios.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.city?.toLowerCase().includes(query)
      );
    }

    return radios;
  }, [allRadios, selectedState, searchQuery]);

  const sportsRadios = filteredRadios.filter(r => r.isSportsRadio);
  const otherRadios = filteredRadios.filter(r => !r.isSportsRadio);

  const handleRadioPress = (radio: Radio) => {
    setSelectedRadio(radio);
    setIsPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setIsPlayerVisible(false);
    setSelectedRadio(null);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Back button and Title */}
      <View style={styles.titleRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <RadioIcon color="#6366f1" size={28} />
        <Text style={styles.title}>Rádios Esportivas</Text>
      </View>
      <Text style={styles.subtitle}>
        Ouça as transmissões de jogos ao vivo
      </Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color="#6b7280" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar rádio..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#6b7280" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* State filter */}
      <View style={styles.filterContainer}>
        <MapPin color="#9ca3af" size={16} />
        <FlatList
          data={STATES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.filterScrollContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedState(item.code)}
              style={[
                styles.filterChip,
                selectedState === item.code && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedState === item.code && styles.filterChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Section title for sports radios */}
      {sportsRadios.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            📻 Rádios Esportivas ({sportsRadios.length})
          </Text>
        </View>
      )}
    </View>
  );

  const renderOtherRadiosHeader = () => {
    if (otherRadios.length === 0) return null;
    return (
      <View style={[styles.sectionHeader, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>
          📰 Outras Rádios ({otherRadios.length})
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <RadioIcon color="#4b5563" size={48} />
      <Text style={styles.emptyText}>Nenhuma rádio encontrada</Text>
      <Text style={styles.emptySubtext}>
        Tente alterar os filtros ou buscar por outro termo
      </Text>
    </View>
  );

  const combinedData = [
    ...sportsRadios,
    ...(otherRadios.length > 0 ? [{ id: 'other-header', isHeader: true }] : []),
    ...otherRadios,
  ];

  return (
    <LinearGradient
      colors={['#0f0f1a', '#1a1a2e']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={combinedData}
          keyExtractor={(item: any) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: any) => {
            if (item.isHeader) {
              return renderOtherRadiosHeader();
            }
            return (
              <RadioCard
                radio={item}
                onPress={() => handleRadioPress(item)}
              />
            );
          }}
        />

        <RadioPlayerModal
          visible={isPlayerVisible}
          radio={selectedRadio}
          onClose={handleClosePlayer}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginRight: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingLeft: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e32',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
    textAlign: 'center',
  },
});
