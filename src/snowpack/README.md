# snowpack-plugin-jsxmin
> `jsxmin` allows you to write JSX and transpile it to plain, vanilla javascript without React or any other runtime libraries.

This is an example configuration for using `jsxmin` via Snowpack's Babel plugin.

**NOTE:** this is not an installable *snowpack plugin* at this point &mdash; just an example configuration using Babel. 

Installation
============
```
npm install @snowpack/plugin-babel babel-plugin-jsxmin
```

Usage
=====
**`snowpack.config.js`**
> This is an example snowpack configuration file that will run *.jsx file through `jsxmin` for transpilation.
```javascript
module.exports = {
  "plugins": [
    [
      "@snowpack/plugin-babel",
      {
        "input": [".js", ".jsx"],
        "transformOptions": {
          "plugins":  [["babel-plugin-jsxmin", {"enableOutputSimplification": true}]]
        }
      }
    ]
  ]
}
```
