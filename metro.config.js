// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's default assetExts includes ttf/otf but not woff2. The web build
// loads subset woff2 faces (see scripts/build-fonts.mjs), so it has to be
// registered here or the require() calls in lib/fonts.web.ts fail to resolve.
config.resolver.assetExts.push('woff2');

module.exports = config;
