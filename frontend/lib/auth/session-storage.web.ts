import type { SessionStorage } from './session-manager';

const KEY = 'sportpoint.session.v1';
export const sessionStorage: SessionStorage = {
  read: async () => typeof window === 'undefined' ? null : window.localStorage.getItem(KEY),
  write: async value => {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, value);
  },
};
