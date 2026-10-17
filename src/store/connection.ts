import { create } from 'zustand';

/**
 * Whether the API (the office PC) answered the last request. It goes false
 * when a request gets no answer at all, and back to true with the next one
 * that does, so the app can say the server is off.
 */
export const useConnectionStore = create<{ online: boolean }>(() => ({ online: true }));

export const setServerOnline = (online: boolean) => {
  if (useConnectionStore.getState().online !== online) useConnectionStore.setState({ online });
};
