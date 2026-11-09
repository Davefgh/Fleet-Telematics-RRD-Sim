import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import { createFleetClient } from "@fleet/api-client";

/**
 * Resolve backend URL:
 * 1. EXPO_PUBLIC_API_URL env variable if set
 * 2. Expo Constants hostUri (dynamically extracts the developer PC's IP when running Expo Go / dev build)
 * 3. Metro SourceCode scriptURL
 * 4. Local machine Wi-Fi IP fallback (192.168.254.120)
 * 5. Android emulator loopback (10.0.2.2)
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // In Expo Go or development build, hostUri is "192.168.x.x:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8000`;
    }
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    const host = match ? match[1] : null;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8000`;
    }
  }

  // Developer host Wi-Fi IP on local network
  return "http://192.168.254.120:8000";
}

export const API_URL = getApiUrl();
export const client = createFleetClient({ baseUrl: API_URL });
