import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../services/api";
import { Country } from "../types/country";
import { useNavigation } from "@react-navigation/native";
import { LucideSearch } from "lucide-react-native";
import AdBanner from "../components/AdBanner";

export const ExploreScreen = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    setLoading(true);
    const data = await api.getCountries();
    // Filter out countries without flags or weird data if needed
    const validCountries = data.filter((c) => c.name && c.flag);
    setCountries(validCountries);
    setFilteredCountries(validCountries);
    setLoading(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const filtered = countries.filter((c) =>
      c.name.toLowerCase().includes(text.toLowerCase()),
    );
    setFilteredCountries(filtered);
  };

  const renderItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate("LeagueList", { country: item.name })}>
      <Image source={{ uri: item.flag }} style={styles.flag} />
      <Text style={styles.countryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={["#0f0f0f", "#1a1a1a", "#0f0f0f"]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <View style={styles.searchContainer}>
            <LucideSearch color="#666" size={20} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#666"
              value={search}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
        />

        {/* Banner de Anúncio */}
        <AdBanner />
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
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
    letterSpacing: -1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  flag: {
    width: 32,
    height: 24,
    resizeMode: "contain", // Flags might be SVG, need to check if Image handles it well. Usually yes on Expo.
    marginRight: 16,
    borderRadius: 4,
  },
  countryName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
