# jsxmin &mdash; _minimal jsx templating._
> `jsxmin` allows you to write JSX and transpile it to plain, vanilla javascript without React or any other runtime libraries.

Motivation
==========
[JSX](https://reactjs.org/docs/introducing-jsx.html) provides an intuitive and straightforward syntax that's easy to learn, battle-tested, and capable of scaling to large teams and production implementations. However, there are times when using all of React isn't available on your toolchain or environment, or you may be looking for something that is ultra-portable, or maybe you just want to go back to the old days of simple js templating (🤗).

This project attempts to take JSX syntax and transpile it to plain javascript via string concatenation and function calls.

Example
=======
A basic example:
```
const Button = (props) => <button class="btn primary">{props.label}</button>
```
Will output:
```
const Button = (props) => '<button class="btn primary">' + props.label + '</button>';
```
Which can then be called like this:
```
console.log(Button({
  label: 'Hello World'
});
// '<button class="btn primary">Hello World</button>'
```
_\[TODO: add more examples. See [tests/test.js](tests/test.js) for now.\]_

API
============
_\[TODO: add documentation\]_

Options
============
_\[TODO: add documentation\]_

Installation
============
To install and use as a module in your Nodejs/Babel toolchain, run:
```
npm install jsxmin
```
Or to install the babel plug-in, run:
```
npm install babel-plugin-jsxmin
```
And add this to your [Babel configuration](https://babeljs.io/docs/en/configuration):
```
{
  ...
  plugins:  ['babel-plugin-jsxmin']
  ...
}
```
See [`babel-plugin-jsxmin/README`](./src/babel-plugin/README.md) for more details.

Security
========
`jsxmin` does not currently escape or otherwise sanitize user input and thus could be vulnerable to content injection or XSS attacks (or a myriad of other [attack](https://owasp.org/www-community/attacks/) [vectors](https://developer.mozilla.org/en-US/docs/Web/Security/Types_of_attacks)). Please ensure all user generated content has been sanitized before passing to any `jsxmin` compiled template or function. This project should probably not be considered production-ready until then.

TODO
====
- [ ] Finalize the main api (`transpileFile` vs `transpileSource` vs `run`) and add documentation.
- [ ] Security and XSS sanitization
- [ ] Add more examples
    - See [tests/test.js](tests/test.js) for basic and advanced usecases (like partials, control flows, and plugin options) 
- [ ] Add more integrations
  - [~~Express~~](examples/express)
  - [~~Fastify~~](examples/fastify)
  - Webpack
  - Snowpack
- [ ] Add support for including a shared/common util that could do the following:
    - Handle escaping and sanitizing user input
    - Add support for control structures and loops, etc
    - Reduce various manual checks
- [ ] ...?


License
=======
MIT
