import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";

// ============================================
// CONFIGURAÇÃO DE ANÚNCIOS
// ============================================
// ID de produção do bloco de anúncios
const PRODUCTION_AD_UNIT_ID = "ca-app-pub-6929713450943259/6336096916";

// IDs de TESTE do Google - sempre mostram anúncios de teste
const TEST_AD_UNIT_ID_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_AD_UNIT_ID_IOS = "ca-app-pub-3940256099942544/2934735716";

// Altere para 'true' para testar se os anúncios aparecem
// IMPORTANTE: Mude para 'false' antes de publicar!
const USE_TEST_ADS = true; // TEMPORÁRIO - MUDE PARA false ANTES DE PUBLICAR!

// Seleciona o ID correto baseado no modo e plataforma
const BANNER_AD_UNIT_ID = USE_TEST_ADS 
  ? (Platform.OS === "ios" ? TEST_AD_UNIT_ID_IOS : TEST_AD_UNIT_ID_ANDROID)
  : PRODUCTION_AD_UNIT_ID;

// Tenta importar o módulo - retorna null se não disponível
let BannerAd: any = null;
let BannerAdSize: any = null;
let MobileAds: any = null;

try {
  const ads = require("react-native-google-mobile-ads");
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  MobileAds = ads.default;
  console.log("[AdBanner] Módulo carregado com sucesso");
} catch (e) {
  console.log("[AdBanner] Módulo de anúncios não disponível:", e);
}

interface AdBannerProps {
  size?: any;
}

export default function AdBanner({ size }: AdBannerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar o SDK do Google Mobile Ads
    const initAds = async () => {
      console.log("[AdBanner] =======================================");
      console.log("[AdBanner] Modo de teste:", USE_TEST_ADS ? "ATIVADO" : "DESATIVADO");
      console.log("[AdBanner] AD Unit ID:", BANNER_AD_UNIT_ID);
      console.log("[AdBanner] Plataforma:", Platform.OS);
      console.log("[AdBanner] =======================================");
      
      if (MobileAds) {
        try {
          console.log("[AdBanner] Inicializando MobileAds SDK...");
          const status = await MobileAds().initialize();
          console.log("[AdBanner] MobileAds SDK inicializado!", status);
          setIsInitialized(true);
        } catch (error: any) {
          console.log("[AdBanner] ❌ Erro ao inicializar SDK:", error?.message);
          console.log("[AdBanner] Erro completo:", JSON.stringify(error));
          setAdError(error?.message);
        }
      } else {
        console.log("[AdBanner] ⚠️ MobileAds não disponível (Expo Go?)");
      }
    };
    initAds();
  }, []);

  // Não renderiza nada se o módulo não estiver disponível (Expo Go)
  if (!BannerAd) {
    console.log("[AdBanner] BannerAd não disponível");
    return null;
  }

  if (!isInitialized) {
    console.log("[AdBanner] SDK ainda não inicializado");
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={size || BannerAdSize?.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log("[AdBanner] ✅ Anúncio carregado com sucesso!");
          console.log("[AdBanner] Unit ID usado:", BANNER_AD_UNIT_ID);
        }}
        onAdFailedToLoad={(error: any) => {
          console.log("[AdBanner] ❌ Falha ao carregar anúncio");
          console.log("[AdBanner] Código do erro:", error?.code);
          console.log("[AdBanner] Mensagem:", error?.message);
          console.log("[AdBanner] Erro completo:", JSON.stringify(error));
          setAdError(error?.message || `Erro ${error?.code}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
});
