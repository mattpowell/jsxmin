import * as Dom from './dom.js';

import DefaultHandlers, {setTrustedSymbol} from './handlers.js'

// export const SYM = setTrustedSymbol(Symbol('jsxmin.trusted'));
export const globalHandlerRegistry = {};

export function render(tmpl, ...args) {
  let out = tmpl;

  if (typeof tmpl === 'function') {
    out = tmpl(...args)
  }

  if (out instanceof Promise) {
    return out.then(r => render(r))
  }else if (typeof out === 'function') {
    return (...args) => render(out, ...args)
  }

  return typeof out.toString === 'function' ? out.toString() : ('' + out);

}

const upgradeRootsRegistry = [];
export async function mount(root, tmpl, data, {
  applyHtml = Dom.apply,
  registerEvents = Dom.register,
  wrapperTagName = 'jsxmin-root' // root.tagName
} = {}) {

  const isUpgradedRoot = upgradeRootsRegistry.includes(root);

  const html = `<${wrapperTagName}>${render(tmpl, data)}</${wrapperTagName}>`;

  if (!isUpgradedRoot) {
    upgradeRootsRegistry.push(root);
    registerEvents(root, globalHandlerRegistry);
  }

  await applyHtml(root, html)

}


let globalHandlerCount = 0;
export function registerStaticEventHandler(fn) {
  const existingHandler = Object.entries(globalHandlerRegistry).find(([id, f]) => f === fn);
  const id = existingHandler && existingHandler[0] || (globalHandlerCount += 1);
  globalHandlerRegistry[id] = fn;
  return id;
}

export default {
  ...DefaultHandlers,
  __event: registerStaticEventHandler,
};