import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../constants/theme";

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: colors.errorText,
    fontSize: 13,
    marginBottom: 6,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.errorButtonBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  retryText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "600",
  },
});
