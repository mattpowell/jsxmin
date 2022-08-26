

async function render(tmpl, arg) {
  // NOTE: since jsxmin-express is still a CommonJS module we need to dynamically import the runtime (an ES Module)
  return import('jsxmin/runtime').then(({render}) => render(tmpl, arg)).catch(err => {
    console.error('Error while rendering. Attempting manual invocation', err);
    return tmpl(arg)
  });
}

module.exports = ({
  doctype = '<!DOCTYPE html>'
} = {}) => {
  let isBabelRegistered = false;
  return async (filename, options, cb) => {

    if (!isBabelRegistered) {

      if (typeof options.settings.opts.isRuntimeLibEnabled === 'undefined') {
        options.settings.opts.isRuntimeLibEnabled = false;
      }

      // NOTE: need to use the experimental worker because the babel plugin is now an ES Module
      require('@babel/register/experimental-worker')({
        only: [new RegExp('^' + options.settings.views)],
        extensions: ['.jsx'],
        cache: true,
        plugins:  [['jsxmin/babel-plugin', options.settings.opts]],
      });
      isBabelRegistered = true;
    }

    try {
      const module = require(path);
      const template = typeof module === 'function' ? module : (module && module.default);
      const props = {...options};

      // clean-up express-specific fields
      delete props.settings;
      delete props._locals;
      delete props.cache;

      const html =  doctype + (await Promise.resolve(render(template, props)));
      cb(null, html)
    }catch(err) {
      cb(err);
    }
  }
}
