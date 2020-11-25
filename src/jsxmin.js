const Util = require('util');
const Fs = require('fs');
const Babel = require('@babel/core');

const asyncRead = Util.promisify(Fs.readFile);
const asyncExists = Util.promisify(Fs.exists);

const Api = module.exports = {

  async transpileFile(path, opts) {
    const source = await asyncRead(path, 'utf-8');
    return Api.transpileSource(source, opts);
  },

  async transpileSource(source, opts = {}) {
    const compiled = Babel.transform(source, {
      plugins:  [['./src/babel-plugin', opts]],
    });
    return compiled.code;
  },

  async run(source, opts) {
    const isFile = await asyncExists(source);
    const compiled = await Api[isFile ? 'transpileFile' : 'transpileSource'](source, opts);
    return eval(compiled);
  }
};
