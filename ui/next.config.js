const withTM = require('next-transpile-modules')(["../lib"]);

const nextConfig = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.fallback = {
      fs: false,
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),
      events: require.resolve('process/browser'),
      assert: require.resolve("assert/"),
      // util: require.resolve("util/"),
      constants: require.resolve("constants/"),
      os: require.resolve("os/")
    };
    return config;
  }
};

module.exports = withTM(nextConfig);
