import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MatchProvider } from './src/context/MatchContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { TeamSelectionScreen } from './src/screens/TeamSelectionScreen';
import { LeaguesExplorer } from './src/screens/LeaguesExplorer';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

function AppNavigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="TeamSelection" component={TeamSelectionScreen} />
          <Stack.Screen name="LeaguesExplorer" component={LeaguesExplorer} />
          <Stack.Screen name="Standings" component={StandingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <MatchProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigation />
          </NavigationContainer>
        </MatchProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
