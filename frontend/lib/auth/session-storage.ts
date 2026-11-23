import * as SecureStore from 'expo-secure-store';
import type { SessionStorage } from './session-manager';

const KEY = 'sportpoint.session.v1';
export const sessionStorage: SessionStorage = {
  read: () => SecureStore.getItemAsync(KEY),
  write: value => value === null ? SecureStore.deleteItemAsync(KEY) : SecureStore.setItemAsync(KEY, value),
};
