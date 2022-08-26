const trust = Symbol.for('jsxmin.trust');
let trusted = Symbol.for('jsxmin.trusted');

// NOTE: `trusted` needs to be a single, distinct symbol defined once for the runtime for full safety. To do
// that, call setTrustedSymbol with your own created symbol. E.g., `setTrustedSymbol(Symbol('private'))`
export const setTrustedSymbol = s => (trusted = s);

const global = (globalThis || window || this);

const camelToHyphenCase = str => str.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

const mappings = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
};

const __escape = s => {
  return ('' + s).replace(/[&<>'"]/g, m => mappings[m]);
}
const __escape_attr = val => ('' + val).replace(/"/g, '&quot;');

// `{id: 1234, callback() {} }` --> `data-whatever="{&quot;id&quot;: 1234}"` (NOTE: double quotes are escaped)
const __attr = obj => __escape_attr(typeof obj === 'object' ? JSON.stringify(obj) : obj);

// {backgroundColor: 'red', color: 'black', 'font-size': 20} --> `style="background-color: red; color: black; font-size: 20px"`
const __style = obj => __escape_attr(Object.entries(obj).map(([prop, val]) => {
  if (typeof val === 'number') val += 'px';
  return `${camelToHyphenCase(prop)}:${val};`;
}).join(''));


// `{'is-loading': true, container: 'my-container', content: false}` --> `class="is-loading container"`
// `'is-loading'` --> `class="is-loading"`
// `['is-loading', 'container']` --> `class="is-loading container"`
const __class = obj => __escape_attr((typeof obj === 'string' ? obj : (Array.isArray(obj) ? obj : Object.entries(obj).filter(e => e[1]).map(e => e[0])).join(' ')));

const __event = fn => {
  const id = Date.now().toString(36) + Math.round(Math.random() * 1E9).toString(36);
  global[id] = fn;
  return id;
};

const __spread = o => (Object.entries(o || {}).reduce((attrs, [key, value]) => {
  const attrName = key === 'className' ? 'class' : key;
  const attrVal = attrName === 'class' && typeof value === 'object' ? __class(value) : (attrName === 'style' ? __style(value) : __attr(value))
  return `${attrs} ${attrName}="${attrVal}"`;
}, ''));

const __trust = val => ({
  get [trust](){
    return trusted
  },
  toString() {
    return Array.isArray(val) ? val.join('') : val.toString()
  }
});

const __html = (val, params) => {

  if (typeof val === 'function') {
    val = __html(typeof params === 'undefined' ? val() : val(params))
  }

  if (Array.isArray(val)) {
    val = __trust(val.map(v => __html(v)));
  }

  if (val == null) {
    val = '';
  }

  if (val instanceof Promise) {
    return val.then(__html)
  }

  if (typeof val === 'object' && val[trust] !== trusted) {
    val = val.hasOwnProperty('toString') ? val.toString() : JSON.stringify(val);
  }

  return val[trust] === trusted ? val : __escape(val);
};

export default {
  __attr,
  __style,
  __class,
  __event,
  __spread,
  __trust,
  __html,
};