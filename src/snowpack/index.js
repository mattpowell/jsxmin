const babel = require('@babel/core');

module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: '../babel-plugin', // NOTE: use `babel-plugin-jsxmin` when outside of this repo
    resolve: {
      input: ['.jsx'],
      output: ['.js'],
    },
    async load({filePath}) {
      const result = await babel.transformFileAsync(filePath);
      return result.code;
    },
  };
};
