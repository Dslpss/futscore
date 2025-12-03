import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { registerForPushNotificationsAsync } from "../services/notifications";
import { authApi } from "../services/authApi";
import { CONFIG } from "../constants/config";

// Backend URL - Railway Production
export const API_URL = "https://futscore-production.up.railway.app/auth";
const BACKEND_URL = CONFIG.BACKEND_URL;

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  // Registrar push token quando usuário estiver logado
  async function registerPushToken(authToken?: string) {
    try {
      console.log("[Auth] Iniciando registro de push token...");
      const pushToken = await registerForPushNotificationsAsync();
      
      if (pushToken) {
        console.log("[Auth] Push token obtido:", pushToken.substring(0, 30) + "...");
        
        // Se authToken foi passado, usar diretamente no header
        if (authToken) {
          const response = await fetch(`${BACKEND_URL}/user/push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ pushToken }),
          });
          
          if (response.ok) {
            console.log("[Auth] Push token registrado no servidor com sucesso!");
          } else {
            const error = await response.json();
            console.error("[Auth] Erro ao registrar push token:", error);
          }
        } else {
          // Usar authApi que pega token do AsyncStorage
          await authApi.registerPushToken(pushToken);
          console.log("[Auth] Push token registrado no servidor com sucesso!");
        }
      } else {
        console.log("[Auth] Não foi possível obter push token (permissão negada ou emulador)");
      }
    } catch (error) {
      console.error("[Auth] Erro ao registrar push token:", error);
    }
  }

  async function loadStorageData() {
    try {
      const storedUser = await AsyncStorage.getItem("@FutScore:user");
      const storedToken = await AsyncStorage.getItem("@FutScore:token");

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        // Configure axios defaults
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${storedToken}`;

        // Registrar push token ao carregar dados do usuário
        registerPushToken();
      }
    } catch (error) {
      console.error("Error loading auth data", error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(newToken: string, newUser: User) {
    try {
      setUser(newUser);
      setToken(newToken);

      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      await AsyncStorage.setItem("@FutScore:user", JSON.stringify(newUser));
      await AsyncStorage.setItem("@FutScore:token", newToken);

      // Registrar push token após login - passar o token diretamente
      registerPushToken(newToken);
    } catch (error) {
      console.error("Error signing in", error);
    }
  }

  async function signOut() {
    try {
      // Remover push token do servidor antes de deslogar
      await authApi.removePushToken();

      setUser(null);
      setToken(null);
      await AsyncStorage.clear();
    } catch (error) {
      console.error("Error signing out", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
