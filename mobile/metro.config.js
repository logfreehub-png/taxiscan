const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Force Metro to resolve Zustand to CommonJS to avoid 'import.meta' syntax error on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("zustand")) {
    try {
      const result = require.resolve(moduleName, { paths: [__dirname] });
      return context.resolveRequest(context, result, platform);
    } catch {
      // fallback if require.resolve fails
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
