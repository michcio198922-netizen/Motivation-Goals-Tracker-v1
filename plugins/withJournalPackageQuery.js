const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withJournalPackageQuery(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.queries = manifest.queries || [];

    let queries = manifest.queries[0];
    if (!queries) {
      queries = { package: [] };
      manifest.queries.push(queries);
    }
    queries.package = queries.package || [];

    const packageName = 'pl.smcjournal.app';
    const exists = queries.package.some((item) => item?.$?.['android:name'] === packageName);
    if (!exists) {
      queries.package.push({ $: { 'android:name': packageName } });
    }

    return config;
  });
};
