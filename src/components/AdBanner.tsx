import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, AppState } from "react-native";

// ID do bloco de anúncios - usa ID de teste em __DEV__ para garantir preenchimento
const TEST_BANNER_AD_UNIT_ID = Platform.select({
  android: "ca-app-pub-3940256099942544/9214589741",
  ios: "ca-app-pub-3940256099942544/2435281174",
}) as string;

const PRODUCTION_BANNER_AD_UNIT_ID = "ca-app-pub-6929713450943259/6665972230";

const BANNER_AD_UNIT_ID = __DEV__
  ? TEST_BANNER_AD_UNIT_ID
  : PRODUCTION_BANNER_AD_UNIT_ID;

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

// Configuração de retries
const MAX_RETRIES = 5;
// Backoff exponencial: 15s, 30s, 60s, 120s, 240s
const getRetryDelay = (attempt: number) =>
  Math.min(15000 * Math.pow(2, attempt), 240000);

interface AdBannerProps {
  size?: any;
}

export default function AdBanner({ size }: AdBannerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // Tenta tamanhos alternativos de banner se o principal falhar
  const [currentSizeIndex, setCurrentSizeIndex] = useState(0);

  const bannerSizes = BannerAdSize
    ? [
        BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
        BannerAdSize.BANNER,
        BannerAdSize.FULL_BANNER,
        BannerAdSize.LARGE_BANNER,
      ]
    : [];

  useEffect(() => {
    const initAds = async () => {
      if (MobileAds) {
        try {
          console.log("[AdBanner] Inicializando MobileAds SDK...");
          await MobileAds().initialize();
          console.log("[AdBanner] MobileAds SDK inicializado!");
          setIsInitialized(true);
        } catch (error: any) {
          console.log("[AdBanner] Erro ao inicializar SDK:", error?.message);
          setAdFailed(true);
        }
      }
    };
    initAds();

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // Quando o app volta do background, tenta carregar o anúncio novamente
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && isInitialized && !adLoaded) {
        console.log(
          "[AdBanner] 🔄 App voltou ao foreground, tentando carregar anúncio...",
        );
        retryCount.current = 0;
        setCurrentSizeIndex(0);
        setAdFailed(false);
        setRetryKey((prev) => prev + 1);
      }
    });

    return () => subscription.remove();
  }, [isInitialized, adLoaded]);

  const scheduleRetry = useCallback(() => {
    const delay = getRetryDelay(retryCount.current);
    retryCount.current += 1;
    console.log(
      `[AdBanner] 🔄 Tentando novamente em ${delay / 1000}s (tentativa ${retryCount.current}/${MAX_RETRIES})...`,
    );
    retryTimer.current = setTimeout(() => {
      setAdFailed(false);
      setRetryKey((prev) => prev + 1);
    }, delay);
  }, []);

  const handleAdLoaded = useCallback(() => {
    console.log("[AdBanner] ✅ Anúncio carregado com sucesso!");
    retryCount.current = 0;
    setAdLoaded(true);
    setAdFailed(false);
  }, []);

  const handleAdFailedToLoad = useCallback(
    (error: any) => {
      const code = error?.code ?? error?.errorCode ?? "UNKNOWN";
      const msg = error?.message ?? "Erro desconhecido";
      console.log(
        `[AdBanner] ❌ Falha ao carregar anúncio - Código: ${code}, Mensagem: ${msg}, Tamanho idx: ${currentSizeIndex}`,
      );

      setAdLoaded(false);

      // Se o tamanho atual falhou, tenta o próximo tamanho antes de fazer retry completo
      if (currentSizeIndex < bannerSizes.length - 1) {
        console.log("[AdBanner] 🔄 Tentando tamanho de banner alternativo...");
        setCurrentSizeIndex((prev) => prev + 1);
        setRetryKey((prev) => prev + 1);
        return;
      }

      // Passou por todos os tamanhos, faz retry com backoff
      const isRetryable =
        code === 3 ||
        code === 2 ||
        code === 1 ||
        code === "ERROR_CODE_NO_FILL" ||
        code === "ERROR_CODE_NETWORK_ERROR" ||
        code === "ERROR_CODE_INTERNAL_ERROR";

      if (retryCount.current < MAX_RETRIES && isRetryable) {
        setCurrentSizeIndex(0); // volta pro primeiro tamanho
        scheduleRetry();
      } else {
        console.log("[AdBanner] ⛔ Todas as tentativas esgotadas, desistindo.");
        setAdFailed(true);
      }
    },
    [currentSizeIndex, bannerSizes.length, scheduleRetry],
  );

  if (!BannerAd || !isInitialized || adFailed) {
    return null;
  }

  const selectedSize =
    size || bannerSizes[currentSizeIndex] || BannerAdSize?.BANNER;

  return (
    <View style={[styles.container, !adLoaded && styles.hidden]}>
      <BannerAd
        key={`ad-banner-${retryKey}-${currentSizeIndex}`}
        unitId={BANNER_AD_UNIT_ID}
        size={selectedSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
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
  hidden: {
    height: 0,
    overflow: "hidden",
    opacity: 0,
  },
});
