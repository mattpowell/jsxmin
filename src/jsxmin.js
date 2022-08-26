import Babel from '@babel/core';

const Api = {

  async transform(source, opts = {}) {
    const compiled = await Babel.transformAsync(source, {
      plugins:  [['jsxmin/babel-plugin', opts]],
    });
    return compiled.code
  },

  async execute(source, opts) {

    if (opts?.isRuntimeLibEnabled) {
      console.warn('[WARN] isRuntimeLibEnabled is not supported for `execute()`; disabling and continuing.')
      opts.isRuntimeEnabled = opts.isRuntimeLibEnabled;
      opts.isRuntimeLibEnabled = false;
    }

    const compiled = await Api.transform(source, opts);
    return eval(compiled);
  }
};

export default Api;