const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
