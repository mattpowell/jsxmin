module.exports = ({
  doctype = '<!DOCTYPE html>'
} = {}) => {
  let isBabelRegistered = false;
  return async (filename, options, cb) => {

    if (!isBabelRegistered) {
      require('@babel/register')({
        only: [new RegExp('^' + options.settings.views)],
        extensions: ['.jsx'],
        cache: true,
        plugins:  [['babel-plugin-jsxmin', options.settings.opts]], // __dirname + '/../babel-plugin'
      });
      isBabelRegistered = true;
    }

    try {
      const template = require(filename);
      const props = {...options};

      // clean-up express-specific fields
      delete props.settings;
      delete props._locals;
      delete props.cache;

      const html =  doctype + (await Promise.resolve(template(props)));
      cb(null, html)
    }catch(err) {
      cb(err);
    }
  }
}
