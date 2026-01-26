import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { LucideX, LucideMaximize2 } from "lucide-react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { MsnVideo } from "../types/video";

const { width, height } = Dimensions.get("window");

interface VideoPlayerModalProps {
  visible: boolean;
  video: MsnVideo | null;
  onClose: () => void;
}

// Extract YouTube video ID from various URL formats or video ID field
const extractYouTubeId = (video: MsnVideo): string | null => {
  // The video ID is usually at the end of the MSN video ID
  // Format: SportRadar_Soccer_..._Video_OeJ0gebmzbQ
  const idParts = video.id.split("_Video_");
  if (idParts.length > 1) {
    return idParts[1];
  }

  // Try to extract from URL
  const urlMatch = video.url.match(/vid=([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
};

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  video,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);

  // Keep screen awake while player is visible
  React.useEffect(() => {
    const tag = "video-player-wakelock";
    if (visible) {
      activateKeepAwakeAsync(tag);
    }
    return () => {
      deactivateKeepAwake(tag);
    };
  }, [visible]);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  if (!video) return null;

  const videoId = extractYouTubeId(video);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent>
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.overlay}>
        <LinearGradient
          colors={["rgba(0,0,0,0.98)", "rgba(10,10,10,0.98)"]}
          style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}>
              <LucideX color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          {/* Video Player */}
          <View style={styles.playerContainer}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Carregando vídeo...</Text>
              </View>
            )}

            {videoId ? (
              <YoutubePlayer
                height={width * 0.5625} // 16:9 aspect ratio
                width={width}
                play={playing}
                videoId={videoId}
                onChangeState={onStateChange}
                onReady={() => setLoading(false)}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Não foi possível carregar o vídeo
                </Text>
              </View>
            )}
          </View>

          {/* Video Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={3}>
              {video.title}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {video.videoType === "Highlight"
                    ? "Melhores Momentos"
                    : video.videoType === "Recap"
                      ? "Resumo"
                      : video.videoType}
                </Text>
              </View>

              <Text style={styles.provider}>{video.dataProvider}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerContainer: {
    width: width,
    height: width * 0.5625,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    zIndex: 10,
  },
  loadingText: {
    color: "#888",
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#888",
    fontSize: 14,
  },
  infoContainer: {
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
  },
  provider: {
    color: "#666",
    fontSize: 13,
  },
});
