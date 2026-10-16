import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'KalingaCare',
  webDir: 'dist',
  plugins: {
    // Google Sign-In (src/utils/googleSignIn.ts). The plugin loads no
    // providers unless listed here. skipNativeAuth: the native side only
    // fetches the Google ID token; the Firebase JS SDK does the actual
    // sign-in, so auth.currentUser works the same as email/password.
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
