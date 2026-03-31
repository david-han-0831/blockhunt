/**
 * html5-qrcode ships source maps that reference .ts paths not published on npm,
 * so source-map-loader logs many ENOENT warnings. They are harmless; suppress them.
 */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const next = webpackConfig.ignoreWarnings || [];
      webpackConfig.ignoreWarnings = [
        ...next,
        /Failed to parse source map/,
      ];
      return webpackConfig;
    },
  },
};
