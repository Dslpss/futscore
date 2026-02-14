import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  BellOff,
  Star,
  Goal,
  Play,
  ChevronLeft,
  Info,
  Trophy,
} from "lucide-react-native";
import { authApi } from "../services/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from "../hooks/useSubscription";
import { Lock } from "lucide-react-native";
import { PremiumTrialModal } from "../components/PremiumTrialModal";
import { useFavorites } from "../context/FavoritesContext";

const NOTIFICATION_SETTINGS_KEY = "futscore_notification_settings";
const LAST_ACTIVE_SETTINGS_KEY = "futscore_last_active_notification_settings";

interface NotificationSettings {
  allMatches: boolean;
  favoritesOnly: boolean;
  favoriteLeaguesNotify: boolean; // Notificações de ligas favoritas
  goals: boolean;
  matchStart: boolean;
}

export function NotificationSettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState<NotificationSettings>({
    allMatches: true,
    favoritesOnly: false,
    favoriteLeaguesNotify: false,
    goals: true,
    matchStart: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isPremium, hasTrialAvailable, refreshSubscription, loading: subscriptionLoading } = useSubscription();
  const { favoriteLeagues } = useFavorites();
  const [showTrialModal, setShowTrialModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data: any = await authApi.getNotificationSettings();
      // Garantir que todos os campos existam (para compatibilidade com dados antigos)
      const loadedSettings = {
        allMatches: data.allMatches ?? false,
        favoritesOnly: data.favoritesOnly ?? true,
        favoriteLeaguesNotify: data.favoriteLeaguesNotify ?? false,
        goals: data.goals ?? true,
        matchStart: data.matchStart ?? true,
      };
      setSettings(loadedSettings);

      // Salvar localmente também para uso offline
      await AsyncStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(loadedSettings)
      );
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      // Tentar carregar do cache local
      try {
        const localSettings = await AsyncStorage.getItem(
          NOTIFICATION_SETTINGS_KEY
        );
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings({
            ...parsed,
            favoriteLeaguesNotify: parsed.favoriteLeaguesNotify ?? false,
          });
        }
      } catch {
        // Usar valores padrão
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    try {
      // Se ainda está carregando o status de premium, aguardar
      if (subscriptionLoading) {
        await refreshSubscription();
        return;
      }
      
      // Verificar Premium
      if (!isPremium) {
        if (key === "favoritesOnly" && value === true) {
          if (hasTrialAvailable) {
            setShowTrialModal(true);
          } else {
            navigation.navigate("Subscription");
          }
          return;
        }
        // Desativar 'todos os jogos' ativa 'apenas favoritos' automaticamente, então bloqueia também
        if (key === "allMatches" && value === false) {
          if (hasTrialAvailable) {
            setShowTrialModal(true);
          } else {
            navigation.navigate("Subscription");
          }
          return;
        }
      }

      setSaving(true);

      let newSettings = { ...settings, [key]: value };

      // Lógica: se ativar "apenas favoritos", desativar "todos os jogos"
      if (key === "favoritesOnly" && value) {
        newSettings.allMatches = false;
      }
      // Se ativar "todos os jogos", desativar "apenas favoritos"
      if (key === "allMatches" && value) {
        newSettings.favoritesOnly = false;
      }
      // Se desativar ambos, NÃO ativar favoritos por padrão (permitir desligar tudo)
      // if (
      //   (key === "allMatches" && !value && !settings.favoritesOnly) ||
      //   (key === "favoritesOnly" && !value && !settings.allMatches)
      // ) {
      //   newSettings.favoritesOnly = true;
      // }

      setSettings(newSettings);

      // Salvar localmente PRIMEIRO (para uso imediato pelo matchService)
      await AsyncStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(newSettings)
      );

      // Depois sincronizar com o servidor
      await authApi.updateNotificationSettings(newSettings);
      console.log("[Settings] Configurações salvas:", newSettings);
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      Alert.alert("Erro", "Não foi possível salvar a configuração");
      // Reverter em caso de erro
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const areNotificationsEnabled = () => {
    return settings.allMatches || settings.favoritesOnly || settings.favoriteLeaguesNotify;
  };

  const toggleMasterSwitch = async () => {
    if (saving) return;

    const isEnabled = areNotificationsEnabled();

    setSaving(true);
    try {
      let newSettings: NotificationSettings;

      if (isEnabled) {
        // Desativar tudo -> Salvar estado atual para restaurar depois
        await AsyncStorage.setItem(LAST_ACTIVE_SETTINGS_KEY, JSON.stringify(settings));
        
        newSettings = {
          ...settings,
          allMatches: false,
          favoritesOnly: false,
          favoriteLeaguesNotify: false,
        };
      } else {
        // Ativar -> Restaurar último estado ou padrão
        try {
          const lastSettingsStr = await AsyncStorage.getItem(LAST_ACTIVE_SETTINGS_KEY);
          if (lastSettingsStr) {
            const lastSettings = JSON.parse(lastSettingsStr);
            // Garantir que pelo menos algo seja ativado se o lastSettings estava tudo false (o que seria estranho)
            if (!lastSettings.allMatches && !lastSettings.favoritesOnly && !lastSettings.favoriteLeaguesNotify) {
              newSettings = { ...settings, favoritesOnly: true };
            } else {
              newSettings = { ...settings, ...lastSettings };
            }
          } else {
            // Padrão: Apenas favoritos
            newSettings = { ...settings, favoritesOnly: true };
          }
        } catch {
           newSettings = { ...settings, favoritesOnly: true };
        }
      }

      setSettings(newSettings);
      
      // Salvar localmente
      await AsyncStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(newSettings)
      );

      // Sincronizar com servidor
      await authApi.updateNotificationSettings(newSettings);
      
    } catch (error) {
       Alert.alert("Erro", "Não foi possível atualizar as configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#09090b", "#18181b", "#09090b"]}
        style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificações</Text>
          <View style={styles.headerRight}>
             <Switch
                value={areNotificationsEnabled()}
                onValueChange={toggleMasterSwitch}
                trackColor={{ false: "#3f3f46", true: "#22c55e50" }}
                thumbColor={areNotificationsEnabled() ? "#22c55e" : "#f4f4f5"}
                disabled={saving || loading}
             />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}>
          {/* Info Card - Changes based on state */}
          {!areNotificationsEnabled() ? (
            <View style={[styles.infoCard, { borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <BellOff size={20} color="#ef4444" />
              <Text style={styles.infoText}>
                As notificações estão desativadas. Ative no topo para receber alertas de gols e jogos.
              </Text>
            </View>
          ) : (
             <View style={styles.infoCard}>
              <Info size={20} color="#60a5fa" />
              <Text style={styles.infoText}>
                Configure como você quer receber notificações sobre as partidas.
                Você pode escolher receber alertas de todos os jogos ou apenas dos
                seus times favoritos.
              </Text>
            </View>
          )}

          {/* Opacidade geral se desativado */}
          <View 
            style={{ opacity: areNotificationsEnabled() ? 1 : 0.5 }} 
            pointerEvents={areNotificationsEnabled() ? 'auto' : 'none'}
          >
            {/* Seção: Quais jogos notificar */}
          <Text style={styles.sectionTitle}>Quais jogos notificar</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                settings.allMatches && styles.optionButtonActive,
              ]}
              onPress={() => updateSetting("allMatches", true)}
              disabled={saving}>
              <View style={styles.optionIconContainer}>
                <Bell
                  size={24}
                  color={settings.allMatches ? "#22c55e" : "#71717a"}
                />
              </View>
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    settings.allMatches && styles.optionTitleActive,
                  ]}>
                  Todos os Jogos
                </Text>
                <Text style={styles.optionDescription}>
                  Receba notificações de todas as partidas ao vivo
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  settings.allMatches && styles.radioButtonActive,
                ]}>
                {settings.allMatches && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[
                styles.optionButton,
                settings.favoritesOnly && styles.optionButtonActive,
              ]}
                onPress={() => updateSetting("favoritesOnly", true)}
              disabled={saving}>
              <View style={styles.optionIconContainer}>
                {!isPremium ? (
                  <Lock size={24} color="#fbbf24" />
                ) : (
                  <Star
                    size={24}
                    color={settings.favoritesOnly ? "#fbbf24" : "#71717a"}
                    fill={settings.favoritesOnly ? "#fbbf24" : "transparent"}
                  />
                )}
              </View>
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    settings.favoritesOnly && styles.optionTitleActive,
                  ]}>
                  Apenas Favoritos
                </Text>
                <Text style={styles.optionDescription}>
                  Receba notificações apenas dos seus times favoritos
                  {!isPremium && <Text style={{color: '#fbbf24'}}> (Premium)</Text>}
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  settings.favoritesOnly && styles.radioButtonActive,
                ]}>
                {settings.favoritesOnly && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Seção: Ligas Favoritas (Premium) */}
          {isPremium && (
            <>
              <Text style={styles.sectionTitle}>Ligas Favoritas 🏆</Text>
              <View style={styles.settingCard}>
                <View style={styles.switchRow}>
                  <View style={[styles.switchIcon, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
                    <Trophy size={22} color="#22c55e" />
                  </View>
                  <View style={styles.switchContent}>
                    <Text style={styles.switchTitle}>Notificar Ligas Favoritas</Text>
                    <Text style={styles.switchDescription}>
                      {favoriteLeagues.length > 0 
                        ? `Receber notificações de jogos das suas ${favoriteLeagues.length} ligas favoritas`
                        : "Primeiro selecione suas ligas favoritas na tela inicial"}
                    </Text>
                  </View>
                  <Switch
                    value={settings.favoriteLeaguesNotify}
                    onValueChange={(value) => updateSetting("favoriteLeaguesNotify", value)}
                    trackColor={{ false: "#3f3f46", true: "#22c55e50" }}
                    thumbColor={settings.favoriteLeaguesNotify ? "#22c55e" : "#71717a"}
                    disabled={saving || favoriteLeagues.length === 0}
                  />
                </View>
                {favoriteLeagues.length === 0 && (
                  <View style={styles.leagueHintRow}>
                    <Text style={styles.leagueHintText}>
                      💡 Toque em "Minhas Ligas" na tela inicial para selecionar
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Mostrar opção bloqueada para não-premium */}
          {!isPremium && (
            <>
              <Text style={styles.sectionTitle}>Ligas Favoritas 🏆</Text>
              <TouchableOpacity
                style={styles.settingCard}
                onPress={() => {
                  if (hasTrialAvailable) {
                    setShowTrialModal(true);
                  } else {
                    navigation.navigate("Subscription");
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.switchRow}>
                  <View style={[styles.switchIcon, { backgroundColor: "rgba(251, 191, 36, 0.15)" }]}>
                    <Lock size={22} color="#fbbf24" />
                  </View>
                  <View style={styles.switchContent}>
                    <Text style={[styles.switchTitle, { color: "#a1a1aa" }]}>Notificar Ligas Favoritas</Text>
                    <Text style={styles.switchDescription}>
                      Receba notificações de jogos das competições que você segue{" "}
                      <Text style={{ color: "#fbbf24" }}>(Premium)</Text>
                    </Text>
                  </View>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>PRO</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* Seção: Tipos de notificação */}
          <Text style={styles.sectionTitle}>Tipos de alerta</Text>

          <View style={styles.settingCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchIcon}>
                <Goal size={22} color="#22c55e" />
              </View>
              <View style={styles.switchContent}>
                <Text style={styles.switchTitle}>Gols</Text>
                <Text style={styles.switchDescription}>
                  Ser notificado quando houver gol
                </Text>
              </View>
              <Switch
                value={settings.goals}
                onValueChange={(value) => updateSetting("goals", value)}
                trackColor={{ false: "#3f3f46", true: "#22c55e50" }}
                thumbColor={settings.goals ? "#22c55e" : "#71717a"}
                disabled={saving}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchIcon}>
                <Play size={22} color="#3b82f6" />
              </View>
              <View style={styles.switchContent}>
                <Text style={styles.switchTitle}>Início da Partida</Text>
                <Text style={styles.switchDescription}>
                  Ser notificado quando o jogo começar
                </Text>
              </View>
              <Switch
                value={settings.matchStart}
                onValueChange={(value) => updateSetting("matchStart", value)}
                trackColor={{ false: "#3f3f46", true: "#3b82f650" }}
                thumbColor={settings.matchStart ? "#3b82f6" : "#71717a"}
                disabled={saving}
              />
            </View>
          </View>

          {/* Status atual */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>📱 Configuração Atual</Text>
            <Text style={styles.statusText}>
              {settings.favoritesOnly
                ? "Você receberá notificações apenas dos seus times favoritos"
                : "Você receberá notificações de todos os jogos"}
              {(() => {
                const types = [];
                if (settings.goals) types.push("gols");
                if (settings.matchStart) types.push("início de partida");

                if (types.length === 0) return " (nenhum tipo selecionado).";
                if (types.length === 1) return ` (apenas ${types[0]}).`;
                if (types.length === 2) return ` (${types[0]} e ${types[1]}).`;
                return ` (${types.slice(0, -1).join(", ")} e ${
                  types[types.length - 1]
                }).`;
              })()}
            </Text>
          </View>

          {saving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.savingText}>Salvando...</Text>
            </View>
          )}

          <View style={styles.bottomSpacing} />
          </View> {/* Fim da view de opacidade */}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>

      {/* Premium Trial Modal */}
      <PremiumTrialModal
        visible={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onTrialActivated={() => {
          setShowTrialModal(false);
          refreshSubscription();
        }}
        featureName="Notificações de Favoritos"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#09090b",
  },
  loadingText: {
    color: "#a1a1aa",
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  infoText: {
    flex: 1,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  optionButtonActive: {
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: "#a1a1aa",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionTitleActive: {
    color: "#fff",
  },
  optionDescription: {
    color: "#71717a",
    fontSize: 12,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#3f3f46",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonActive: {
    borderColor: "#22c55e",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  switchIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  switchContent: {
    flex: 1,
  },
  switchTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  switchDescription: {
    color: "#71717a",
    fontSize: 12,
  },
  statusCard: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  statusTitle: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  statusText: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },
  savingText: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  bottomSpacing: {
    height: 40,
  },
  premiumBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  premiumBadgeText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "700",
  },
  leagueHintRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  leagueHintText: {
    color: "#71717a",
    fontSize: 12,
    fontStyle: "italic",
  },
});
