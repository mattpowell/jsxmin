import {createRequire} from 'node:module';

// TODO: for helpers loader, but should be replaced
const require = createRequire(import.meta.url);

// const toTemplate = require('@babel/template').default;
import BabelTemplateModule from '@babel/template';

const toTemplate = BabelTemplateModule.default;


const placeholderRuntimeHandlers = `
  const __html = (ref, args) => typeof ref === 'function' ? __html(ref(args)) : (ref && typeof ref.toString === 'function' ? ref.toString() : '');
  const __event = fn => fn.toString();
  const __attr = (o) => typeof o === 'string' ? o : JSON.stringify(o);
  const __style = __attr;
  const __class = __attr;
  const __spread = (o) => Object.entries(o || {}).reduce((attrs, [key, value]) => \`\${attrs} \${key}="\${__attr(value)}"\`, '');
  const __trust = (str) => ({ toString: () => str });
  
  export default {
    __attr,
    __style,
    __class,
    __event,
    __spread,
    __trust,
    __html,
  };
`

// TODO: figure out a non-Node specific solution for this (and don't cross packages)
const getRuntimeHandlers = (shouldLoadFromFile = true) => {
  let handlers = placeholderRuntimeHandlers;
  if (shouldLoadFromFile) {
    try {
      const Fs = require('fs');
      const Path = require('path');
      const { fileURLToPath } = require('url');
      const __dirname = Path.dirname(fileURLToPath(import.meta.url));
      handlers = Fs.readFileSync(Path.resolve(__dirname, '../runtime/handlers.js'), 'utf-8');
    }catch(err) {
      console.error('Unable to define runtime handlers from file', err)
    }
  }
  return handlers.replace(/export default/g, 'const $default =').replace(/export/g, '')
};

const PreambleTypes = {
  INLINE: 'inline',
  IMPORT: 'import',
  NONE: 'none',
}

// NOTE: this should be the bare bones definition for each function we use; however, if "runtime lib" is enabled, then import that instead (and alias using the same approach)
const getRuntimePreamble = (type = PreambleTypes.INLINE) => {
  const allowlist = { syntacticPlaceholders: true }
  if (type === PreambleTypes.IMPORT) {
    return toTemplate(`import {
      __html as %%HTML_UID%%,
      __event as %%EVENT_UID%%,
      __attr as %%ATTR_UID%%,
      __style as %%STYLE_UID%%,
      __class as %%CLASS_UID%%,
      __spread as %%SPREAD_UID%%,
      __trust as %%TRUST_UID%%,
    } from 'jsxmin/runtime'`, allowlist);
  }else {
    return toTemplate(`
      const {
        __html: %%HTML_UID%%,
        __event: %%EVENT_UID%%,
        __attr: %%ATTR_UID%%,
        __style: %%STYLE_UID%%,
        __class: %%CLASS_UID%%,
        __spread: %%SPREAD_UID%%,
        __trust: %%TRUST_UID%%,
      } = (function() {
        ${getRuntimeHandlers(type === PreambleTypes.INLINE)}
        return $default;
      })();
    `, allowlist)
  }
}

export default function (babel) {
  const t = babel.types;

  const SpecialJsxAttrs = {
    className: 'class',
    style: 'style',
    htmlFor: 'for',
    key: '_:key'
  };

  function getTransformedJsxAttributes(attrName, attrValue, isStrict, state) {
    const vars = state.runtimeVars || {};

    let isEventListener = false;

    const specialJsxAttr = SpecialJsxAttrs[attrName];

    if (specialJsxAttr) {
      attrName = specialJsxAttr;
    }

    let attrHandler = vars.ATTR_UID;
    if (attrName === SpecialJsxAttrs.className && !isStrict) {
      attrHandler = vars.CLASS_UID;
    }else if (attrName === SpecialJsxAttrs.style) {
      attrHandler = vars.STYLE_UID;
    }else if (/^on[A-Z]/.test(attrName)) {
      isEventListener = true;
      attrHandler = vars.EVENT_UID;
      if (state?.opts?.isRuntimeLibEnabled) {
        attrName = '_:on:' + attrName.replace(/^on/, '').toLowerCase(); // TODO: confirm runtime is able to register events with lowercase
      }else {
        attrName = attrName.toLowerCase();
      }
    }

    return {attrName, attrValue, attrHandler, isEventListener}

  }

  function isExpressionWrapped(expr, wrapperFnName) {
    return t.isCallExpression(expr) && t.isIdentifier(expr.callee) && (expr.callee.name === t.isIdentifier(wrapperFnName) ? wrapperFnName.name : wrapperFnName)
  }

  // helper to create template literals in fluent-esque style
  function createTemplateLiteralBuilder(state) {
    const vars = state.runtimeVars || {};
    const literals = [];
    const quasis = [];
    const add = (...args) => {
      for (let arg of args) {

        // TODO: even if there are expressions within the nested TemplateLiteral, those can be unnested too... currently this only unnests a TemplateLiteral if there's no interpolation/expressions
        const isTrustedTemplateLiteral = isExpressionWrapped(arg, vars.TRUST_UID) && t.isTemplateLiteral(arg.arguments[0]) && !arg.arguments[0].expressions.length
        const isTemplateLiteral = isTrustedTemplateLiteral || t.isTemplateLiteral(arg) && !arg.expressions.length;

        if (isTrustedTemplateLiteral) {
          arg = arg.arguments[0];
        }

        // treat as a literal
        if (typeof arg === 'string' || t.isStringLiteral(arg) || isTemplateLiteral) {
          let literal = arg;

          if (t.isStringLiteral(literal)) {
            literal = literal.value
          }else if (isTemplateLiteral) {
            // TODO: not sure if this is right
            literal = literal.quasis.reduce((str, templateElement) => `${str}${templateElement.value.raw}`, '');
          }

          if (literals.length) {
            const prevLiteral = literals.pop();
            literal = prevLiteral + literal;
          }

          literals.push(literal);

        // treat as a quasi
        }else {
          quasis.push(arg);
          literals.push('');
        }
      }
    }

    const toTemplateLiteral = () => {
      return t.templateLiteral(
        literals.map((str, idx, arr) => strToTemplate(str, idx === arr.length - 1)),
        quasis
      );
    };

    return {
      add,
      toTemplateLiteral
    }
  }

  function strToTemplate(raw, tail = false) {
    return t.templateElement({
      raw, tail
    });
  }

  function stringLiteralAsTemplateLiteral(raw, tail = false) {
    return t.templateLiteral([strToTemplate(raw.replace(/\$/g, '\\$'), tail)], []);
  }


  // TODO: if expr is a Function or an Indentifier for a function then check if the function returns a "constant string literal" and treat the same (but call function with args)
  const needsOutputWrapper = (expr, path) => {

    // TODO: decide if we allow other primitives to be short circuited like this? if we do, can't use helpers to coerce to "printable" string
    const isOutputtableLiteral = node => t.isStringLiteral(node) || t.isNumericLiteral(node);

    if (isOutputtableLiteral(expr)) {
      return false;
    }

    if (t.isIdentifier(expr) && path.scope.hasBinding(expr.name)) {
      const binding = path.scope.getBinding(expr.name);
      const isVariableBindingProcessable = t.isVariableDeclarator(binding.path) && binding.constant;
      if (isVariableBindingProcessable) {
        let ref = binding.path.node.init;

        if (isOutputtableLiteral(ref)) {
          return false;
        }
      }
    }

    return true;
  }


  const api = {
    name: 'babel-plugin-jsxmin',
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push('jsx');
    },
    visitor: {
      Program(path, state) {
        const { opts = {} } = state || {};
        const { isRuntimeEnabled = true, isRuntimeLibEnabled = true } = opts;

        state.runtimeVars = {
          HTML_UID: path.scope.generateUidIdentifier('__html'),
          EVENT_UID: path.scope.generateUidIdentifier('__event'),
          ATTR_UID: path.scope.generateUidIdentifier('__attr'),
          STYLE_UID: path.scope.generateUidIdentifier('__style'),
          CLASS_UID: path.scope.generateUidIdentifier('__class'),
          SPREAD_UID: path.scope.generateUidIdentifier('__spread'),
          TRUST_UID: path.scope.generateUidIdentifier('__trust'),
        };

        const preambleType = isRuntimeLibEnabled ? PreambleTypes.IMPORT : (isRuntimeEnabled ? PreambleTypes.INLINE : PreambleTypes.NONE);
        const preambleGenerator = getRuntimePreamble(preambleType);
        const preamble = preambleGenerator(state.runtimeVars);

        path.node.body.unshift(preamble);

      },

      JSXText(path, state) {
        const vars = state.runtimeVars || {};
        path.replaceWith(t.callExpression(vars.TRUST_UID, [t.stringLiteral(path.node.value)]), path.node);
      },

      JSXExpressionContainer(path, state) {
        const vars = state.runtimeVars || {};

        let expr = path.expression || path.node.expression;

        if (t.isJSXEmptyExpression(expr)) {
          path.remove();
          return;
        }

        if (expr) {

          const needsWrapper = needsOutputWrapper(expr, path);
          if (needsWrapper) {
            expr = t.callExpression(vars.HTML_UID, [expr])
          }

          path.replaceWith(expr);
        }
      },
      JSXAttribute(path) {

        const attrName = path.node.name.name;
        // NOTE: if the value property isn't defined then attempt to treat as an
        //      "html boolean attribute" and set the value as the same name as the attribute
        let attrValue = path.node.value || t.stringLiteral(attrName);

        if (t.isJSXExpressionContainer(attrValue)) {
          attrValue = attrValue.expression;
        }

        // handle newlines
        if (t.isStringLiteral(attrValue)) {
          attrValue = stringLiteralAsTemplateLiteral(attrValue.value);
        }

        // NOTE: ensure the property name is quoted in case the tag attribute isn't a valid js identifier
        path.replaceWith(t.objectProperty(t.stringLiteral(attrName), attrValue));
      },
      JSXMemberExpression(path) {
        // noop
      },
      JSXNamespacedName(path) {
        // noop
      },
      JSXSpreadAttribute(path) {
        path.replaceWith(t.spreadElement(path.node.argument))
      },
      JSXSpreadChild(path, state) {
        const vars = state.runtimeVars || {};
        const expr = path.node.expression;
        path.replaceWith(needsOutputWrapper(expr, path) ? t.callExpression(vars.HTML_UID, [expr]) : expr)
      },
      JSXEmptyExpression(path) {
        path.remove();
      },
      JSXFragment(path, state) {
        const vars = state.runtimeVars || {};

        const CAN_REWRAP = false;

        path.traverse(api.visitor, state);

        const children = path.node.children.filter(child => {
          // prettify the unnecessary whitespace around jsx fragments
          return !(t.isStringLiteral(child) && child.value.trim() === '');
        }).map(child => {
          // unwrap since we re-wrap all children as an array below
          // TODO: this doesn't support unwrapping the parameters being passed to this nested __html call
          if (CAN_REWRAP && isExpressionWrapped(child, vars.HTML_UID) && t.isTemplateLiteral(child.arguments[0])) {
            return child.arguments[0];
          }
          return child;
        })

        // TODO: not working when there's JSXText mixed with JSXExpressionContainer
        const needsWrapped = !CAN_REWRAP || children.every(child => {
          return needsOutputWrapper(child, path);
        });

        const childrenExpr = children.length === 1 ? children[0] : t.arrayExpression(children);
        path.replaceWith(needsWrapped ? t.callExpression(vars.HTML_UID, [childrenExpr]) : childrenExpr);
      },
      JSXElement(path, state) {
        const { opts = {} } = state || {};
        const vars = state.runtimeVars || {};
        const canFindReferencedTag = opts.allowReferencedTagsAsFunctions !== false

        const openingElement = path.node.openingElement;
        // const closingElement = path.node.closingElement;
        // NOTE: The `jsx` plugin enforces that openingElement.name.name will be the same as closingElement.name.name
        const tagName = openingElement.name.name; // tagname is name of tag like div, p etc
        const attributes = openingElement.attributes;

        if (!tagName || !(t.isJSXIdentifier(openingElement.name) || t.isIdentifier(openingElement.name))) {
          throw path.buildCodeFrameError('Unable to resolve scoped tag name (hint: try aliasing nested references to a local variable).');
        }

        path.traverse(api.visitor, state);

        let prevExp;

        // NOTE: `t.isReferenced(path.node, path.parent)` only checks the immediate scope
        let isTagReferencedInScope = canFindReferencedTag && path.scope.hasBinding(tagName);

        if (isTagReferencedInScope) {
          const variableDeclaration = path.findParent(path => t.isVariableDeclarator(path));
          // confirm that the tagName being referenced isn't on the same line of it's variable declration (e.g., const title = <title>Hello</title>)
          if (variableDeclaration && variableDeclaration.node.id.name === tagName) {
            isTagReferencedInScope = false;
          }
        }

        // The jsx "tag" is referencing a function in the outer scope. Collect the appreciate props and attempt to
        // call it and/or just reference it then append the results to the rest of the expression.
        if (isTagReferencedInScope) {

          // if this jsx "tag" has children, pass it to the referenced function as a prop (props.children)
          if (path.node.children && path.node.children.length) {
            let childrenPropValue = t.nullLiteral();
            if (path.node.children.length) {
              childrenPropValue = t.arrayExpression(path.node.children);
            }
            // NOTE: ensure children is added last (so it can't be overridden by a prop/attribute of the same name);
            attributes.push(t.objectProperty(t.stringLiteral('children'), childrenPropValue))
          }
          prevExp = t.callExpression(vars.HTML_UID, [t.identifier(tagName), ...(attributes.length ? [t.objectExpression(attributes)] : [])])

        // The "jsx tag" is just a tag. Convert it to a string and map the attributes too.
        } else {


          const reactCompatLevel = opts.reactCompat;
          const isReactCompatStrict = reactCompatLevel === 'strict';
          const isReactCompatAny = isReactCompatStrict || (reactCompatLevel || typeof reactCompatLevel === 'undefined');

          const {add, toTemplateLiteral} = createTemplateLiteralBuilder(state);

          add('<', tagName);

          let hasEventListenerAttr = false;
          for (let attr of attributes) {

            if (t.isSpreadElement(attr)) {
              add(' ', t.callExpression(vars.SPREAD_UID, [attr.argument]))
              continue;
            }

            if (!t.isObjectProperty(attr)) {
              console.warn('Received a non ObjectProperty attribute. Please report a bug.', attr);
              continue;
            }

            let attrName = attr.key.name || attr.key.value;
            let attrValue = attr.value;
            let attrHandler = vars.ATTR_UID;

            if (isReactCompatAny) {
              const result = getTransformedJsxAttributes(attrName, attrValue, isReactCompatStrict, state);

              attrName = attr.key.name = result.attrName;
              attrValue = attr.value = result.attrValue;
              attrHandler = result.attrHandler;

              if (result.isEventListener && !hasEventListenerAttr) {
                add(' _:on="true"');
                hasEventListenerAttr = true;
              }
            }

            const isExpressionlessTemplateLiteral = (node) => t.isTemplateLiteral(node) && !node.expressions.length;
            if (!(t.isLiteral(attrValue) || isExpressionlessTemplateLiteral(attrValue))) {
              attrValue = attr.value = t.callExpression(attrHandler, [attrValue])
            }

            add(' ', `${attrName}="`, attrValue, '"')

          }

          add(openingElement.selfClosing ? '/>' : '>')

          path.node.children.forEach(child => {
            add(child);
          })

          if (!openingElement.selfClosing) {
            add('</' + tagName + '>');
          }

          prevExp = t.callExpression(vars.TRUST_UID, [toTemplateLiteral()]);
        }

        path.replaceWith(prevExp);
      },
    },
  }

  return api;

};
