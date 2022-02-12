module.exports = function (babel) {
  const t = babel.types;

  // helper to quickly create identifier's from template literals
  function identifier(literals, ...substitutions) {
    let interpolation = '';
    for (let i = 0; i < substitutions.length; i++) {
      interpolation += literals[i] + substitutions[i]
    }
    interpolation += literals[literals.length - 1]
    return t.identifier(interpolation)
  }

  function addWhitespace(expr, position) {
    if (position !== 'AFTER') position = 'BEFORE';
    const isBefore = position === 'BEFORE';
    const space = t.stringLiteral(' ')
    return t.binaryExpression('+', isBefore ? space : expr, isBefore ? expr : space);
  }

  // TODO: add an option to call a common util instead of a ternary with a typeof (to help with size/perf)
  function wrapIdentifierAsCallableOrReference(ident, fnParams) {
    if (!t.isIdentifier(ident) && typeof ident === 'string') {
      ident = t.identifier(ident)
    }


    // TODO: this is needed to support the `transformEsmAsCjs` option; however, this is probably because the nested
    //  expression is not being unwrapped correctly, so this whole function should be reworked.
    if (t.isIdentifier(ident)) {
      const {name} = ident;
      const callScopedBindingExpr = t.callExpression(t.identifier(name), fnParams);
      return t.conditionalExpression(t.binaryExpression('===', t.unaryExpression('typeof', t.identifier(name)), t.stringLiteral('function')), callScopedBindingExpr, t.identifier(name));
    }

    const callScopedBindingExpr = t.callExpression(ident, fnParams);
    return t.conditionalExpression(t.binaryExpression('===', t.unaryExpression('typeof', ident), t.stringLiteral('function')), callScopedBindingExpr, ident);
  }

  function strToTemplate(raw, tail = false) {
    return t.templateElement({
      raw, tail
    });
  }

  function stringLiteralAsTemplateLiteral(raw, tail = false) {
    return t.templateLiteral([strToTemplate(raw, tail)], []);
  }

  function createExpressionFromSpread(attr) {
    const ident = attr.argument;
    // (Object.entries(props).reduce((attrs, [key, value]) => `${attrs} ${key}="${value}"`, ''))
    return t.callExpression(t.memberExpression(t.callExpression(t.memberExpression(identifier`Object`, identifier`entries`), [ident]), identifier`reduce`), [
      t.arrowFunctionExpression([identifier`attrs`, t.arrayPattern([identifier`key`, identifier`value`])], t.templateLiteral([
        strToTemplate('', false),
        strToTemplate(' ', false),
        strToTemplate('=\\"', false),
        strToTemplate('\\"', true)
      ], [identifier`attrs`, identifier`key`, identifier`value`])),
      t.stringLiteral('')
    ]);
  }

  const api = {
    name: 'babel-plugin-jsxmin',
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push('jsx');
    },
    visitor: {
      JSXText(path) {
        path.replaceWith(t.stringLiteral(path.node.value), path.node);
      },
      JSXExpressionContainer(path, state) {
        const { opts = {} } = state || {};

        let expr = path.expression || path.node.expression;

        if (opts.allowReferencesAsFunctions !== false && (t.isIdentifier(expr) || t.isMemberExpression(expr))) {
          let callParams = [];
          if (opts.allowScopedParameterAccess && Array.isArray(path.scope.block.params)) {
            callParams = path.scope.block.params.map(param => {
              // allow spread params to be used as a regular param
              if (t.isObjectPattern(param)) {
                param.type = 'ObjectExpression'
              }
              return param;
            }).filter(param => {
              return t.isObjectExpression(param) ||
                t.isExpression(param) ||
                t.isSpreadElement(param) ||
                t.isJSXNamespacedName(param) ||
                t.isArgumentPlaceholder(param) ||
                t.isIdentifier(param);
            })
          }

          expr = wrapIdentifierAsCallableOrReference(expr, callParams);

        }

        if (expr) {
          path.replaceWith(expr);
        }
      },
      JSXAttribute(path, state) {

        const attrName = path.node.name.name;
        // NOTE: if the value property isn't defined then attempt to treat as an
        //      "html boolean attribute" and set the value as the same name as the attribute
        let expr = path.node.value || t.stringLiteral(attrName);

        if (t.isJSXExpressionContainer(expr)) {
          expr = expr.expression;
          // TODO: add xss sanitization here (`expr.value` is the value... unless it's a reference/Identifier)
        }

        // handle newlines
        if (t.isStringLiteral(expr)) {
          expr = stringLiteralAsTemplateLiteral(expr.value);
        }
        expr = t.binaryExpression('+', t.stringLiteral('"'), t.binaryExpression('+', expr, t.stringLiteral('"')))
        expr = t.binaryExpression('+', t.binaryExpression('+', t.stringLiteral(attrName), t.stringLiteral('=')), expr);
        // NOTE: add a special value (`isWrappedJsxAttribute`) so we can unwrap later if we need to add this to an object to pass to a callable
        expr.isWrappedJsxAttribute = true;

        path.replaceWith(expr);
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
      JSXSpreadChild(path) {
        path.replaceWith(path.node.expression)
      },
      JSXEmptyExpression(path) {
        path.remove();
      },
      JSXFragment(path, state) {
        const { opts = {} } = state || {};
        path.traverse(api.visitor, state);

        const children = path.node.children.filter(child => {
          // prettify the unnecessary whitespace around jsx fragments
          return !(t.isStringLiteral(child) && child.value.trim() === '');
        })

        const joinChildrenExpression = t.memberExpression(t.arrayExpression(children), t.identifier('join'))
        const callExpression = t.callExpression(joinChildrenExpression, [t.stringLiteral(opts.useWhitespace ? ' ' : '')]);
        path.replaceWith(callExpression)
      },
      JSXElement(path, state) {
        const { opts = {} } = state || {};
        const canFindReferencedTag = opts.allowReferencesAsFunctions !== false

        const openingElement = path.node.openingElement;
        const closingElement = path.node.closingElement;
        // NOTE: The `jsx` plugin enforces that openingElement.name.name will be the same as closingElement.name.name
        const tagName = openingElement.name.name; // tagname is name of tag like div, p etc
        const attributes = openingElement.attributes;

        if (!tagName || !(t.isJSXIdentifier(openingElement.name) || t.isIdentifier(openingElement.name))) {
          throw path.buildCodeFrameError('Unable to resolve scoped tag name (hint: try aliasing nested references to a local variable).');
        }

        path.traverse(api.visitor, state);
        //path.get('attributes').traverse(api.visitor, state);

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
          // take the passed in attributes/props and collect them in to a new object to pass to the function
          const nestedProps = attributes.map(attr => {
            if (attr.isWrappedJsxAttribute) {
              // NOTE: ensure the property name is quoted in case the tag attribute isn't a compatible js value
              return t.objectProperty(t.identifier(`'${attr.left.left.value}'`), attr.right.right.left);
            } else {
              return attr;
            }
          })

          // if this jsx "tag" has children, pass it to the referenced function as a prop (props.children)
          if (path.node.children && path.node.children.length) {
            let childrenPropValue;
            // if there's only one, just pass it directly. (very) small perf boost
            if (path.node.children.length === 1) {
              childrenPropValue = path.node.children[0]
            }else {
              const joinChildrenExpression = t.memberExpression(t.arrayExpression(path.node.children), t.identifier('join'))
              childrenPropValue = t.callExpression(joinChildrenExpression, [t.stringLiteral(opts.useWhitespace ? ' ' : '')]);
            }
            // NOTE: ensure children is added last (so it can't be overrided by a prop/attribute of the same name);
            nestedProps.push(t.objectProperty(t.identifier('children'), childrenPropValue))
          }

          prevExp = wrapIdentifierAsCallableOrReference(tagName, nestedProps.length ? [
            t.objectExpression(nestedProps)
          ] : []);

        // The "jsx tag" is just a tag. Convert it to a string and map the attributes too.
        } else {

          prevExp = t.binaryExpression('+', t.stringLiteral('<'), t.stringLiteral(tagName));
          attributes.forEach(attr => {
            if (t.isSpreadElement(attr)) {
              attr = createExpressionFromSpread(attr);
            }
            // TODO: add xss sanitization here (for `attr`)
            prevExp = t.binaryExpression('+', prevExp, addWhitespace(attr));
          })
          prevExp = t.binaryExpression('+', prevExp, t.stringLiteral(openingElement.selfClosing ? '/>' : '>'));

          //path.get('children').traverse(api.visitor, state);
          path.node.children.forEach(child => {
            // TODO: add xss sanitization here
            prevExp = t.binaryExpression('+', prevExp, child);
          })

          if (!openingElement.selfClosing) {
            prevExp = t.binaryExpression('+', prevExp, t.stringLiteral('</' + tagName + '>'));
          }
        }

        path.replaceWith(prevExp);

        if (opts.enableOutputSimplification) {
          const simplify = {
            BinaryExpression(path) {
              if (t.isStringLiteral(path.node.left) && t.isStringLiteral(path.node.right)) {
                path.replaceWith(t.stringLiteral(path.node.left.value + path.node.right.value))
              }
              path.traverse(simplify)
            }
          };
          path.traverse(simplify);
        }
      },
    },
  };
  return api;
};
