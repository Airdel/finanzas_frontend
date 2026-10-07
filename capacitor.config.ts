import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.airdel.finanzas',
  appName: 'Finanzas',
  webDir: 'dist',
  server: {
    // The backend runs on the office PC and is reached over Tailscale with
    // plain HTTP (the tunnel is already encrypted), so the WebView is served
    // over http:// too (an https:// origin would block those calls as mixed
    // content) and cleartext traffic is allowed.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
