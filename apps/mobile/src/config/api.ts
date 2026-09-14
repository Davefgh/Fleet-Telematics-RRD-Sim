import { NativeModules, Platform } from "react-native";
import { createFleetClient } from "@fleet/api-client";

/**
 * Resolve backend URL:
 * 1. EXPO_PUBLIC_API_URL env variable if set
 * 2. Metro bundler host IP (allows real devices on same Wi-Fi)
 * 3. Android emulator loopback fallback (10.0.2.2)
 * 4. Localhost fallback
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    const host = match ? match[1] : null;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8000`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }

  return "http://localhost:8000";
}

export const API_URL = getApiUrl();
export const client = createFleetClient({ baseUrl: API_URL });
