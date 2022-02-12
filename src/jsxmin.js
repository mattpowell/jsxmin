const Babel = require('@babel/core');

const Api = module.exports = {

  transform(source, opts = {}) {
    const compiled = Babel.transform(source, {
      plugins:  [[__dirname + '/babel-plugin', opts], ...(opts.transformEsmAsCjs ? ['@babel/plugin-transform-modules-commonjs'] : [])],
    });
    return compiled.code
  },

  execute(source, opts) {
    const compiled = Api.transform(source, opts);
    return eval(compiled);
  }
};
