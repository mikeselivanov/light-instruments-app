// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's default assetExts includes ttf/otf but not woff2. The web build
// loads subset woff2 faces (see scripts/build-fonts.mjs), so it has to be
// registered here or the require() calls in lib/fonts.web.ts fail to resolve.
config.resolver.assetExts.push('woff2');

// server/ is the push service that runs on the VPS. It has its own
// package.json and its own dependencies, and none of it belongs in the app
// bundle — without this, Metro walks into it and tries to resolve Node
// built-ins it has no business bundling.
config.resolver.blockList = [/\/server\/.*/];

module.exports = config;
