// Token storage that works everywhere: the phone's secure keychain on Android/iOS,
// and the browser's localStorage when the app runs on the web (`npx expo start --web`),
// where expo-secure-store isn't available.
import { Platform } from 'react-native';
import * as NativeSecureStore from 'expo-secure-store';

const web = {
  getItemAsync: async (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItemAsync: async (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } },
  deleteItemAsync: async (k) => { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
};

const SecureStore = Platform.OS === 'web' ? web : NativeSecureStore;
export const { getItemAsync, setItemAsync, deleteItemAsync } = SecureStore;
