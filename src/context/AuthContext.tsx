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

  // Flag para evitar registro duplicado de push token
  const pushTokenRegistered = React.useRef(false);

  useEffect(() => {
    loadStorageData();
  }, []);

  // Registrar push token quando usuário estiver logado
  async function registerPushToken(authToken?: string, force: boolean = false) {
    // Evitar registros duplicados na mesma sessão
    if (pushTokenRegistered.current && !force) {
      console.log("[Auth] Push token já registrado nesta sessão, pulando...");
      return;
    }

    try {
      console.log("[Auth] ========== INICIANDO REGISTRO DE PUSH TOKEN ==========");
      console.log("[Auth] authToken fornecido:", authToken ? "SIM" : "NÃO");
      console.log("[Auth] BACKEND_URL:", BACKEND_URL);
      
      const pushToken = await registerForPushNotificationsAsync();
      console.log("[Auth] Resultado de registerForPushNotificationsAsync:", pushToken ? "TOKEN OBTIDO" : "NULL/UNDEFINED");

      if (pushToken) {
        console.log(
          "[Auth] Push token obtido:",
          pushToken.substring(0, 30) + "..."
        );

        // Se authToken foi passado, usar diretamente no header
        if (authToken) {
          console.log("[Auth] Enviando push token com authToken direto...");
          const response = await fetch(`${BACKEND_URL}/user/push-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ pushToken }),
          });

          console.log("[Auth] Response status:", response.status);
          
          if (response.ok) {
            console.log(
              "[Auth] ✅ Push token registrado no servidor com sucesso!"
            );
            pushTokenRegistered.current = true;
          } else {
            const error = await response.json();
            console.error("[Auth] ❌ Erro ao registrar push token:", error);
          }
        } else {
          // Usar authApi que pega token do AsyncStorage
          console.log("[Auth] Enviando push token via authApi...");
          await authApi.registerPushToken(pushToken);
          console.log("[Auth] ✅ Push token registrado no servidor com sucesso!");
          pushTokenRegistered.current = true;
        }
      } else {
        console.log(
          "[Auth] ⚠️ Não foi possível obter push token (permissão negada ou emulador)"
        );
        console.log("[Auth] Isso pode significar:");
        console.log("[Auth] - Permissão de notificação não foi concedida");
        console.log("[Auth] - O dispositivo é um emulador sem Google Play Services");
        console.log("[Auth] - Houve um erro na comunicação com o Expo Push Service");
      }
      console.log("[Auth] ========== FIM REGISTRO DE PUSH TOKEN ==========");
    } catch (error: any) {
      console.error("[Auth] ❌ Erro crítico ao registrar push token:", error?.message || error);
      console.error("[Auth] Stack:", error?.stack);
    }
  }

  async function loadStorageData() {
    try {
      const storedUser = await AsyncStorage.getItem("@FutScore:user");
      const storedToken = await AsyncStorage.getItem("@FutScore:token");

      console.log("[Auth] loadStorageData - storedUser:", storedUser ? "EXISTS" : "NULL");
      console.log("[Auth] loadStorageData - storedToken:", storedToken ? "EXISTS" : "NULL");

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        // Configure axios defaults
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${storedToken}`;

        // Registrar push token ao carregar dados do usuário
        // Passar o token diretamente para garantir que funcione no build nativo
        console.log("[Auth] loadStorageData - Chamando registerPushToken com token fornecido");
        registerPushToken(storedToken);
      } else {
        console.log("[Auth] loadStorageData - Não há usuário logado, pulando registerPushToken");
      }
    } catch (error) {
      console.error("Error loading auth data", error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(newToken: string, newUser: User) {
    try {
      console.log("[Auth] signIn called - setting user and token");
      setUser(newUser);
      setToken(newToken);

      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      await AsyncStorage.setItem("@FutScore:user", JSON.stringify(newUser));
      await AsyncStorage.setItem("@FutScore:token", newToken);
      
      console.log("[Auth] signIn - AsyncStorage saved, waiting for state to settle...");
      
      // Pequeno delay para garantir que tudo está salvo antes de registrar push token
      await new Promise(resolve => setTimeout(resolve, 500));

      // Registrar push token após login/cadastro - usar force=true para garantir
      console.log("[Auth] signIn - Calling registerPushToken with force=true");
      await registerPushToken(newToken, true);
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
