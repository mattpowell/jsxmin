# jsxmin &mdash; _minimal jsx templating._
> `jsxmin` allows you to write JSX and transpile it to plain, vanilla javascript without React or any other runtime libraries.

Motivation
==========
[JSX](https://reactjs.org/docs/introducing-jsx.html) provides an intuitive and straightforward syntax that's easy to learn, battle-tested, and capable of scaling to large teams and production implementations. However, there are times when using all of React isn't available on your toolchain or environment, or you may be looking for something that is ultra-portable, or maybe you just want to go back to the old days of simple js templating (🤗).

This project attempts to take JSX syntax and transpile it to plain javascript via string concatenation and function calls.

Example
=======
A basic example:
```jsx
const Button = (props) => <button class="btn primary">{props.label || props.children}</button>
```
Will output:
```javascript
const Button = (props) => '<button class="btn primary">' + (props.label || props.children) + '</button>';
```
Which can then be called like this:
```javascript
console.log(Button({
  label: 'Hello World'
}));
// '<button class="btn primary">Hello World</button>'
```
---
Slightly more advanced example using custom elements:
```jsx
import { Button } from './ui';

class HighFive extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = <Button>🖐</Button>
    this.addEventListener('click', () => {
      console.log('High five!!');
    });
  }
}
customElements.define('high-five', HighFive);
```
And can be called like this (as a quick example):
```html
<html>
  <body>
    <high-five></high-five> // High five!!
    <script src="..."></script>
  </body>
</html>
```
---
Slightly more advanced example in the vein of SPAs:
```jsx
import { Button } from './ui';

const App = ({name}) => <>
    <p>Hello{name ? ' ' + name : ''}!</p>
    <Button>🖐</Button>
</>

document.body.innerHTML = <App/>
```
And can be called like this (as a quick example):
```html
<html>
  <body>
    <script src="..."></script>
  </body>
</html>
```
---
_See [tests/test.js](tests/test.js) for more examples._

API
============
**`.transform(source, opts)`**
> Transforms a string with `jsx` to plain javascript and is the primary function of this library.

`source` should be a string.

`opts` is an object with properties as [defined below](#options).

---
 
**`.execute(source, opts)`**
> Transform and execute a string with `jsx` and get the resulting output.

`source` should be a string.

`opts` is an object with properties as [defined below](#options).

#### Note: Whatever [valid] JavaScript statement is on the last line is what will be returned. See [Dynamic usage](#direct-usage) example below.

[comment]: <> (_For Example:_)
[comment]: <> (```javascript)
[comment]: <> (const result = Jsxmin.execute&#40;`)
[comment]: <> (  const name = <>World</>;)
[comment]: <> (  <>Hello {name}</>)
[comment]: <> (`&#41;)
[comment]: <> (console.log&#40;result&#41;; // Hello World)
[comment]: <> (```)
 
Options
=======
**`enableOutputSimplification[=false]`**
> Takes a second pass to simplify the transformed source.

This step adds additional parsing and traversing and can add significant overhead. If the transformed source code is being passed to another tool to minify (and/or bundle) then this step is probably superfluous. 

**`useWhitespace[=false]`**
> Adds additional whitespace between tags to improve readability.

**`allowReferencesAsFunctions[=true]`**
> Checks if a reference (variable) is a function and if so, executes the function and uses its output instead.

**`allowScopedParameterAccess[=false]`**
> Pass along the `props` (the first parameter) to each subsequent function call.

Note: This is _experimental_ and could have unexpected results. Requires `allowReferencesAsFunctions` to be set to `true`.

**`transformEsmAsCjs[=false]`**
> Transforms ECMAScript modules to CommonJS -- only the syntax of import/export statements and import expressions is transformed.

Note: This is _experimental_ and could have unexpected results. Also, this requires the `@babel/plugin-transform-modules-commonjs` package to be installed (which is an optional dependency of this package).

[See below for usage examples](#direct-usage)

Installation
============
To install and use as a module in your Nodejs/Babel toolchain, run:
```bash
npm install jsxmin
```
Or to install the babel plug-in, run:
```bash
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

Direct Usage
====
**Dynamic usage:**
```javascript
const Jsxmin = require('jsxmin');

const tmpl = Jsxmin.execute(`
    ({name}) => <p>Hello {name || 'world'}</p>
`, {
  // NOTE: these are the default values and are only being passed here for demonstration purposes.
  enableOutputSimplification: false,
  useWhitespace: false,
  allowReferencesAsFunctions: true,
  allowScopedParameterAccess: false,
});

console.log(tmpl({name: 'Github'})) // '<p>Hello Github</p>'
```
---
**Build-time usage:**
```javascript

const Jsxmin = require('jsxmin');
const Fs = require('fs');

const source = Fs.readFileSync('./ui.jsx', 'utf-8');
const compiled = Jsxmin.transform(source);

Fs.writeFileSync('./ui.js', compiled);
```

Integrations
============
  - [Express](examples/express)
  - [Fastify](examples/fastify)
  - [Snowpack](examples/snowpack)

Security
========
`jsxmin` does not currently escape or otherwise sanitize user input and thus could be vulnerable to content injection or XSS attacks (or a myriad of other [attack](https://owasp.org/www-community/attacks/) [vectors](https://developer.mozilla.org/en-US/docs/Web/Security/Types_of_attacks)). Please ensure all user generated content has been sanitized before passing to any `jsxmin` compiled template or function. This project should probably not be considered production-ready until then.

TODO
====
- [x] ~~Finalize the main api (`transpileFile` vs `transpileSource` vs `run`) and add documentation.~~
- [ ] Support compiling jsx as ES modules (specifically importing and exporting)
  - [x] Support ES modules and additional Babel plugins in Fastify and Express plugins
  - [ ] Resolve TODO on line 28 of [babel-plugin/index.js](./src/babel-plugin/index.js#L28)
- [x] Support async/await in Fastify and Express plugins
- [x] Support spread operator for attributes (e.g., `<Button {...props}></Button>`)
- [ ] Use template literals instead of string literals for everything
- [ ] Clean up internal directory structure:
    - Make releasing and incrementing on individual packages easier
    - Resolve relative vs absolute package name references
    - Ensure everything is installable and runnable
- [ ] Security and XSS sanitization
- [ ] Add warnings for unsupported attributes (like `className`, `dangerouslySetInnerHTML`, `htmlFor`,  `onClick` and other event listeners)
    - Most of [these](https://reactjs.org/docs/dom-elements.html#differences-in-attributes)
- [ ] Add more examples
    - See [tests/test.js](tests/test.js) for basic and advanced usecases (like partials, control flows, and plugin options) 
- [ ] Add more integrations
  - [~~Express~~](examples/express)
  - [~~Fastify~~](examples/fastify)
  - [~~Snowpack~~](examples/snowpack)
  - Webpack
- [ ] Add support for including a shared/common util that could do the following:
    - Handle escaping and sanitizing user input
    - Add support for control structures and loops, etc
    - Reduce various manual checks
- [ ] ...?


License
=======
MIT
