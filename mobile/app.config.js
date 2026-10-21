// Extends app.json with values that come from the build environment.
// GOOGLE_MAPS_API_KEY is optional: without it the live-tracking screen falls
// back to an "Open in Google Maps" button instead of an in-app map.
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey) {
    config.android = {
      ...config.android,
      config: { ...(config.android?.config || {}), googleMaps: { apiKey: mapsKey } },
    };
  }
  config.android = {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE || config.android?.versionCode || 1),
  };
  return config;
};
