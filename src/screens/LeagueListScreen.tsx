import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { League } from '../types';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LucideChevronLeft } from 'lucide-react-native';

export const LeagueListScreen = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const route = useRoute();
  const navigation = useNavigation();
  const { country } = route.params as { country: string };

  useEffect(() => {
    loadLeagues();
  }, [country]);

  const loadLeagues = async () => {
    setLoading(true);
    const data = await api.getLeaguesByCountry(country);
    setLeagues(data);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: League }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <Image source={{ uri: item.logo }} style={styles.logo} />
      <View style={styles.info}>
          <Text style={styles.leagueName}>{item.name}</Text>
          <Text style={styles.leagueType}>{item.type || 'League'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <LucideChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>{country}</Text>
        </View>

        <FlatList
          data={leagues}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No leagues found.</Text>
                </View>
            ) : null
          }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 12,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 16,
  },
  info: {
      flex: 1,
  },
  leagueName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leagueType: {
      color: '#888',
      fontSize: 12,
      marginTop: 2,
  },
  emptyContainer: {
      padding: 40,
      alignItems: 'center',
  },
  emptyText: {
      color: '#666',
  }
});
