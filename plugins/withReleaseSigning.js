const { withAppBuildGradle } = require('@expo/config-plugins');

function replaceLast(source, search, replacement) {
  const index = source.lastIndexOf(search);
  if (index === -1) return source;
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;

    let contents = config.modResults.contents;
    const marker = 'android {';
    const signingBlock = `android {\n    signingConfigs {\n        motivationRelease {\n            storeFile file('motivation-release.jks')\n            storePassword System.getenv('MOTIVATION_KEYSTORE_PASSWORD') ?: ''\n            keyAlias 'motivation'\n            keyPassword System.getenv('MOTIVATION_KEYSTORE_PASSWORD') ?: ''\n        }\n    }`;

    if (!contents.includes('motivationRelease')) {
      contents = contents.replace(marker, signingBlock);
    }

    contents = replaceLast(
      contents,
      'signingConfig signingConfigs.debug',
      'signingConfig signingConfigs.motivationRelease'
    );

    config.modResults.contents = contents;
    return config;
  });
};
