const buildVersionCode = Number(process.env.BUILD_VERSION_CODE || 1);
const buildVersionName = process.env.BUILD_VERSION_NAME || '1.0.0';

module.exports = {
  expo: {
    name: 'Motivation & Goals',
    slug: 'motivation-goals-trader',
    version: buildVersionName,
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#070A0F'
    },
    android: {
      package: 'pl.trader.motivationgoals',
      versionCode: buildVersionCode,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#070A0F'
      }
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'Aplikacja potrzebuje dostępu do zdjęć, aby ustawić obraz w sekcji Moje dlaczego.',
          cameraPermission: 'Aplikacja może użyć aparatu do zdjęcia w sekcji Moje dlaczego.',
          microphonePermission: false
        }
      ],
      './plugins/withReleaseSigning'
    ]
  }
};
