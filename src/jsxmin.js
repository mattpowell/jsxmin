const Babel = require('@babel/core');

const Api = module.exports = {

  transform(source, opts = {}) {
    const compiled = Babel.transform(source, {
      plugins:  [[__dirname + '/babel-plugin', opts]],
    });
    return compiled.code
  },

  execute(source, opts) {
    const compiled = Api.transform(source, opts);
    return eval(compiled);
  }
};
