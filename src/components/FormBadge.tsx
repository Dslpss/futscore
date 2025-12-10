import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface FormBadgeProps {
  form?: string; // e.g., "VVDVE" (V=vitória, D=derrota, E=empate)
  size?: "small" | "medium";
}

/**
 * Displays team form as colored dots
 * V (win) = green, D (loss) = red, E (draw) = yellow
 */
export const FormBadge: React.FC<FormBadgeProps> = ({ form, size = "small" }) => {
  if (!form) return null;

  // Normalize form letters (ESPN uses V/D/E in PT-BR)
  const getColor = (char: string): string => {
    switch (char.toUpperCase()) {
      case "V": // Victory
      case "W": // Win
        return "#22c55e"; // green
      case "D": // Draw (or Derrota in some cases)
        return "#ef4444"; // red for loss
      case "E": // Empate (draw)
        return "#eab308"; // yellow
      case "L": // Loss
        return "#ef4444"; // red
      default:
        return "#71717a"; // gray
    }
  };

  const dotSize = size === "small" ? 6 : 8;
  const gap = size === "small" ? 2 : 3;

  // Show last 5 matches
  const recentForm = form.slice(-5);

  return (
    <View style={[styles.container, { gap }]}>
      {recentForm.split("").map((char, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: getColor(char),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
