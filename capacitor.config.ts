import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pilipaladown.app',
  appName: 'PiliPalaDown',
  webDir: 'dist-web',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    Filesystem: {},
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
}

export default config
