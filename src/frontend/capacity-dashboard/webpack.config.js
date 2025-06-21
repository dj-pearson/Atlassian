const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/dashboard.js",
  output: {
    filename: "dashboard.bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
  ],
  resolve: {
    fallback: {
      path: false,
      fs: false,
    },
  },
  mode: "production",
  optimization: {
    minimize: true,
  },
};
