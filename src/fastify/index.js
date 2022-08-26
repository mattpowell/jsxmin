const Path = require('path');
const Plugin = require('fastify-plugin');
const Decache = require('decache');
const { NODE_ENV } = process.env || {};

async function render(tmpl, arg) {
  // NOTE: since fastify-jsxmin is still a CommonJS module we need to dynamically import the runtime (an ES Module)
  return import('jsxmin/runtime').then(({render}) => render(tmpl, arg)).catch(err => {
    console.error('Error while rendering. Attempting manual invocation', err);
    return tmpl(arg)
  });
}

function View(fastify, {
  doctype = '<!DOCTYPE html>',
  views = './',
  engine = 'jsx',
  extensions = [`.${engine}`],
  useCache = NODE_ENV === 'production',
  additionalBabelPlugins = [],
  opts = {}
} = {}, next) {

  if (typeof opts.isRuntimeLibEnabled === 'undefined') {
    opts.isRuntimeLibEnabled = false;
  }

  // NOTE: need to use the experimental worker because the babel plugin is now an ES Module
  require('@babel/register/experimental-worker')({
    only: [new RegExp('^' + Path.resolve(views))],
    extensions,
    cache: useCache,
    plugins:  [['jsxmin/babel-plugin', opts], ...additionalBabelPlugins],
  });

  async function renderer(res, file, data) {

    if (!file) {
      this.send(new Error('Missing page'))
      return
    }

    try {
      const path = Path.resolve(views, file + '.' + engine);
      if (!useCache) {
        Decache(path);
      }
      const module = require(path);
      const template = typeof module === 'function' ? module : (module && module.default);
      const props = {...data};
      const html =  doctype + (await Promise.resolve(render(template, props)));

      if (!res) {
        return html;
      }

      if (!res.getHeader('content-type')) {
        res.header('Content-Type', 'text/html; charset=utf8');
      }

      return res.send(html);

    } catch (err) {
      console.error(err);
      return res.status(500).send(new Error('Unable to render: ' + err));
    }
  }

  fastify.decorate('view', async function() {
    const args = Array.from(arguments);
    let done;
    if (typeof args[args.length - 1] === 'function') {
      done = args.pop()
    }
    const result = await renderer(null, ...args)

    if (typeof done === 'function') {
      done(null, result);
    }else {
      return Promise.resolve(result);
    }

  });

  fastify.decorateReply('view', async function(file, data) {
    await renderer(this, file, data);
    return this;
  })

  next();
}
module.exports = Plugin(View, { fastify: '>=3.x' })
