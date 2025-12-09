import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppState, AppStateStatus } from "react-native";
import { MatchProvider } from "./src/context/MatchContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { TeamSelectionScreen } from "./src/screens/TeamSelectionScreen";
import { LeaguesExplorer } from "./src/screens/LeaguesExplorer";
import { StandingsScreen } from "./src/screens/StandingsScreen";
import { NotificationSettingsScreen } from "./src/screens/NotificationSettingsScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { VideosScreen } from "./src/screens/VideosScreen";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { forceCheckMatches } from "./src/services/backgroundTask";

const Stack = createNativeStackNavigator();

function AppNavigation() {
  const { isAuthenticated, loading } = useAuth();
  const appState = useRef(AppState.currentState);

  // Verificar partidas quando app volta ao foreground (apenas se autenticado)
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // Se estava em background/inactive e voltou para active
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          console.log("[App] Returned to foreground, checking matches...");
          forceCheckMatches();
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#09090b",
        }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // Renderizar navegação autenticada COM providers de dados
  if (isAuthenticated) {
    return (
      <FavoritesProvider>
        <MatchProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="TeamSelection"
              component={TeamSelectionScreen}
            />
            <Stack.Screen name="LeaguesExplorer" component={LeaguesExplorer} />
            <Stack.Screen name="Standings" component={StandingsScreen} />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
            />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="Videos" component={VideosScreen} />
          </Stack.Navigator>
        </MatchProvider>
      </FavoritesProvider>
    );
  }

  // Renderizar navegação não autenticada SEM providers de dados
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigation />
      </NavigationContainer>
    </AuthProvider>
  );
}
