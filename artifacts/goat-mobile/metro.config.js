const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

module.exports = config;
