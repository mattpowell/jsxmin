# jsxmin-express
> `jsxmin` allows you to write JSX and transpile it to plain, vanilla javascript without React or any other runtime libraries.

This is the Express plugin for [`jsxmin`](https://www.npmjs.com/package/jsxmin) &mdash; please see [`jsxmin`](../../README.md) for additional context.

Installation
============

```bash
npm install jsxmin-express
```

Usage
=====
*See the `express` [example folder](../../examples/express) for more details*
**`server.js`**
```javascript
// NOTE: "borrowed" from:
// https://expressjs.com/en/starter/hello-world.html

const express = require('express');
const app = express();

app.set('view engine', 'jsxmin-express')

app.get('/', (req, res) => {
  res.render('home', {
    time: new Date()
  });
});

app.listen(3000, () => {
  console.log(`Example app listening at http://localhost:3000`);
});
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


License
=======
MIT
