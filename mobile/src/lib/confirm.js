import { Alert, Platform } from 'react-native';

/**
 * Yes/no question that works everywhere. Alert.alert with buttons does nothing on
 * Expo web, which is why "Log out" looked dead there; the browser's confirm() is used instead.
 * Resolves true if the person chose `okText`.
 */
export default function confirm(title, message, okText = 'OK', { destructive = false } = {}) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n\n')));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
