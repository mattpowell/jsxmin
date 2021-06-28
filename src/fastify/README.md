# fastify-jsxmin
> `jsxmin` allows you to write JSX and transpile it to plain, vanilla javascript without React or any other runtime libraries.

This is the Fastify plugin for [`jsxmin`](https://www.npmjs.com/package/jsxmin) &mdash; please see [`jsxmin`](../../README.md) for additional context.

Installation
============

```bash
npm install fastify-jsxmin
```

Usage
=====
*See the `fastify` [example folder](../../examples/fastify) for more details*
**`server.js`**
```javascript
// NOTE: "borrowed" from:
// https://www.fastify.io/docs/latest/Getting-Started/

const Jsxmin = require('fastify-jsxmin');
const Fastify = require('fastify')({
  logger: true
})

Fastify.register(Jsxmin, {
  // NOTE: these are all the defaults and can safely be removed
  doctype: '<!DOCTYPE html>',
  views: './',
  engine: 'jsx',
  useCache: process.env.NODE_ENV === 'production'
});

// Declare a route
Fastify.get('/', function (request, reply) {
  reply.view('./views/home', {
    now: Date.now()
  });
})

// Run the server!
Fastify.listen(3000, function (err, address) {
  if (err) {
    Fastify.log.error(err)
    process.exit(1)
  }
  Fastify.log.info(`server listening on ${address}`)
})
```

**`views/home.jsx`**
```jsx
// global template (could import this from a common directory, for example)
const Layout = props => <html><body>{props.children}</body></html>;

module.exports = props => <Layout>
  The time is currently: {props.time}
</Layout>
```

Options
=======
**`doctype[='<!DOCTYPE html>']`**
> Prepended to the beginning of the response when handling an html response.

**`views[='./']`**
> Directory from which to `require` views/templates from

**`engine[='jsx']`**
> The file type and/or suffix. For example, `home.jsx`

**`useCache[=NODE_ENV === 'production']`**
> Whether to cache the templates between requests. Defaults to `true` in production, otherwise `false`.

License
=======
MIT
