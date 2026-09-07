const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// To support sqlite-vec or other native assets if needed
config.resolver.assetExts.push('gguf', 'bin');

module.exports = config;
