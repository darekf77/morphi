const common = require('./webpack.config.common.js');
const merge = require('webpack-merge');
const { AngularCompilerPlugin } = require('@ngtools/webpack');


module.exports = merge(common, {
  plugins: [
    new AngularCompilerPlugin({
      "mainPath": "main.ts",
      "platform": 0,
      "hostReplacementPaths": {
        "environments/environment.ts": "environments/environment.ts"
      },
      "sourceMap": true,
      "tsConfigPath": "src/tsconfig.app.json",
      "skipCodeGeneration": true,
      "compilerOptions": {}
    })
  ],
  "devServer": {
    "historyApiFallback": true,
    // quiet: true, // needed for friend output
    // noInfo: true,
    // "stats": {
    //   assets: false,
    //   cached: false,
    //   cachedAssets: false,
    //   children: false,
    //   chunks: false,
    //   chunkModules: false,
    //   chunkOrigins: false,
    //   colors: false,
    //   depth: false,
    //   entrypoints: false,
    //   errors: true,
    //   errorDetails: true,
    //   hash: false,
    //   maxModules: 0,
    //   modules: false,
    //   performance: false,
    //   providedExports: false,
    //   publicPath: false,
    //   reasons: false,
    //   source: false,
    //   timings: false,
    //   usedExports: false,
    //   version: false,
    //   warnings: false
    // }
  }
});
