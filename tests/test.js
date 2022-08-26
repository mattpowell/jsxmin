import Jsxmin from 'jsxmin';
import * as Runtime from 'jsxmin/runtime';

const render = async (tmpl, opts = {}) => {
  const fn = await Jsxmin.execute(tmpl, {
    isRuntimeEnabled: true,
    isRuntimeLibEnabled: false,
    ...opts
  });
  return (...args) => Runtime.render(fn, ...args)
}

describe('Basic', () => {
  it('Should handle basic html', async () => {
    const tmpl = await render(`() => <div>Hello world.</div>`);
    expect(tmpl()).toBe(`<div>Hello world.</div>`)
  });

  it('Should support async functions', async () => {
    const tmpl = await render(`
      const sleep = (n) => new Promise(resolve => setTimeout(() => resolve(), n)); 
      async () => {
        await sleep(1000);
        return <div>Hello world.</div>
      }
    `);
    expect(await tmpl()).toBe(`<div>Hello world.</div>`)
  });

  it('Should handle basic html with attributes', async () => {
    const tmpl = await render(`() => <div id="main" selected>Hello world.</div>`);
    expect(tmpl()).toBe(`<div id="main" selected="selected">Hello world.</div>`)
  });

  it('Should handle basic html with interpolation', async () => {
    const tmpl = await render(`(props) => <div>Hello {props.name}.</div>`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello you.</div>`)
  });

  it('Should handle basic html with interpolation and expression', async () => {
    const tmpl = await render(`(props) => <div>Hello {props.name || 'world'}.</div>`);
    expect(tmpl({})).toBe(`<div>Hello world.</div>`)
  });

  it('Should handle basic partials', async () => {
    const tmpl = await render(`(props) => {
      const Name = () => <strong>world</strong>;
      return <div>Hello <Name/>.</div>
    }`);
    expect(tmpl({})).toBe(`<div>Hello <strong>world</strong>.</div>`)
  });

  it('Should handle basic partials with params', async () => {
    const tmpl = await render(`(props) => {
      const Name = (props) => <strong>{props.val}</strong>;
      return <div>Hello <Name val={props.name}/>.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle basic string partials', async () => {
    const tmpl = await render(`(props) => {
      const Name = <strong>{props.name}</strong>;
      return <div>Hello <Name/>.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle basic string partials as interpolation', async () => {
    const tmpl = await render(`(props) => {
      const Name = <strong>{props.name}</strong>;
      return <div>Hello {Name}.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle fragments', async () => {
    const tmpl = await render(`() => <>this & that</>`);
    expect(tmpl()).toBe(`this & that`)
  });

  it('Should handle fragments with tag functions', async () => {
    const tmpl = await render(`const p = (props) => <span>{props.children}</span>; <><p><a>1</a><a>2</a></p></>`);
    expect(tmpl()).toBe(`<span><a>1</a><a>2</a></span>`)
  });

  it('Should handle basic expressions', async () => {
    const tmpl = await render(`(props) => <>before: {props.count}, after: {props.count + 1}</>`);
    expect(tmpl({
      count: 1
    })).toBe(`before: 1, after: 2`)
  });

  it('Should handle children', async () => {
    const tmpl = await render(`(props) => {
      const Wrapper = props => <div class="wrapper">{props.children}</div>; 
      return <div><Wrapper>{props.label}</Wrapper></div>
    }`);
    expect(tmpl({
      label: 'wrapped'
    })).toBe(`<div><div class="wrapper">wrapped</div></div>`)
  });

  it('Should handle spreading props as attributes', async () => {
    const tmpl = await render(`(props) => <div id="main" {...props}>Hello world.</div>`);
    expect(tmpl({
      required: true
    })).toBe(`<div id="main"  required="true">Hello world.</div>`)
  });

  it('Should handle spreading children', async () => {
    const tmpl = await render(`const Tmpl = (props) => <em>{...props.children}</em>; (props) => <Tmpl><>one</> <>two</></Tmpl>`);
    expect(tmpl({
      required: true
    })).toBe(`<em>one two</em>`)
  });

  it('Should handle directly spreading props as attributes', async () => {
    const tmpl = await render(`(props) => <div id="main" {...({class: 'label', required: true})}>Hello world.</div>`);
    expect(tmpl({})).toBe(`<div id="main"  class="label" required="true">Hello world.</div>`)
  });

  it('Should run tagnames if they\'re functions', async () => {
    const tmpl = await render(`
      const Label = ({value}) => <strong>{value}</strong>;
      (props) => <Label value={props.name}/>
    `);
    expect(tmpl({
      name: 'Testing'
    })).toBe(`<strong>Testing</strong>`)
  });

  it('Should escape prop names passed to functions', async () => {
    const tmpl = await render(`
      const Label = (props) => <strong>{props['data-id']}</strong>;
      (props) => <Label data-id={1}/>
    `);
    expect(tmpl({})).toBe(`<strong>1</strong>`)
  });

  it('Should handle multiline strings', async () => {
    const tmpl = await render(`
      props => <p style="color: red;
                      background-color: blue;
                      font-size: 1em"
        >Text.</p>;
    `);
    expect(tmpl({})).toBe(`<p style="color: red;
                      background-color: blue;
                      font-size: 1em">Text.</p>`)
  });
});

describe('Advanced', () => {
  it('Shouldn\'t coerce tagNames within variable declarations', async () => {
    const tmpl = await render(`(props) => {
      const button = props.button && <button>{props.button}</button> || ''
      return <div>{button}</div>
    }`);
    expect(tmpl({
      button: 'button label'
    })).toBe(`<div><button>button label</button></div>`)
  });

  it('Should reference scoped variables', async () => {
    const tmpl = await render(`
      const Label = props => <strong>{props.value}</strong>;
      (function() {
        return (props) => <div><Label value={props.label}/></div>
      })()
    `);
    expect(tmpl({
      label: 'test'
    })).toBe(`<div><strong>test</strong></div>`)
  });

  it('Should reference deeply nested scoped variables', async () => {
    let errMsg = '';
    try {
      const tmpl = await render(`
        const Util = {
          This: {
            is: {
              really: {
                deep: {
                  Label(props) {
                    return <strong>{props.value}</strong>;
                  }
                }
              }
            }
          }
        };
        (function() {
          return (props) => <div><Util.This.is.really.deep.Label value={props.label}/></div>
        })()
      `);

      // TODO: this should work and not throw... one day
      // expect(tmpl({
      //   label: 'test II'
      // })).toBe(`<div><strong>test II</strong></div>`)
    }catch(err) {
      errMsg = err.message;
    }
    expect(errMsg).toMatch(/Unable to resolve scoped tag name \(hint: try aliasing nested references to a local variable\)./)
  });

  it('Should support destructuring in function declarations', async () => {
    const tmpl = await render(`
      const strong = ({value}) => <strong>{value}</strong>;
      strong;
    `);
    expect(tmpl({
      value: 'TEST!'
    })).toBe(`<strong>TEST!</strong>`)
  })
});

describe('reactCompat', () => {
  const tests = [{
    label: 'className 1',
    tmpl: `<div className={{'is-greeting': true, global: props.name === 'world', isLoading: false, static: 'yes'}}>Hello</div>`,
    expected: '<div class="is-greeting global static">Hello</div>',
    // TODO: should technically/probably be: <div class="[object Object]">Hello</div>
    strict: '<div class="{&quot;is-greeting&quot;:true,&quot;global&quot;:true,&quot;isLoading&quot;:false,&quot;static&quot;:&quot;yes&quot;}">Hello</div>'
  }, {
    label: 'className 2',
    tmpl: `<div className="label">Hello</div>`,
    expected: '<div class="label">Hello</div>',
  }, {
    label: 'style',
    tmpl: `<div style={{backgroundColor: 'red', height: 10}}>Hello</div>`,
    expected: '<div style="background-color:red;height:10px;">Hello</div>',
  }, {
    label: 'htmlFor',
    tmpl: `<label htmlFor="username">Username:</label>`,
    expected: '<label for="username">Username:</label>',
  }, {
    label: 'selected',
    tmpl: `<select><option value="lime">Lime</option> <option selected value="coconut">Coconut</option></select>`,
    expected: '<select><option value="lime">Lime</option> <option selected="selected" value="coconut">Coconut</option></select>',
  }, {
    label: 'onChange',
    tmpl: `<select onChange={() => console.log('change')}><option value="lime">Lime</option> <option selected value="coconut">Coconut</option></select>`,
    // TODO: attribute will be `_:onchange` when isRuntimeLibEnabled is set to true
    expected: new RegExp('<select _:on="true" onchange="[^"]+?"><option value="lime">Lime</option> <option selected="selected" value="coconut">Coconut</option></select>'),
  }, {
    label: 'comments',
    // NOTE: without a JSXElement (or JSXFragment like below), then the parser assumes it's a regular BlockStatement
    // with a regular CommentBlock inside which we don't handle (we only handle JSXEmptyExpressions).
    tmpl: `<>{/* this is a comment. */}</>`,
    expected: '',
  }];

  for (let test of tests) {
    for (let reactCompat of [true, 'strict']) {
      it(`=${reactCompat}: ${test.label}`, async () => {
        const tmpl = await render(`(props) => ${test.tmpl}`, {reactCompat});
        const expected = test[reactCompat] || test.expected;
        expect(tmpl({
          name: 'world'
        }))[typeof expected === 'string' ? 'toBe' : 'toMatch'](expected);
      });
    }
  }
});

describe('Control flows and structures', () => {
  it('Basic conditional', async () => {
    const tmpl = await render(`(props) => {
      const If = ({condition, children}) => condition ? children : '';
      return <div>Hello <If condition={props.name.toLowerCase() === 'world'}>WORLD!!</If></div>
    }`);
    expect(tmpl({
      name: 'world'
    })).toBe(`<div>Hello WORLD!!</div>`)
  })
});


describe('Options', () => {
  it('allowReferencedTagsAsFunctions=true', async () => {
    const compiled = await render(`const label = () => <>HELLO WORLD</>; <p><label>label</label></p>`, {
      allowReferencedTagsAsFunctions: true
    });
    expect(compiled()).toBe(`<p>HELLO WORLD</p>`)
  });
  it('allowReferencedTagsAsFunctions=false', async () => {
    const compiled = await render(`const label = () => <>HELLO WORLD</>; <p><label>label</label></p>`, {
      allowReferencedTagsAsFunctions: false
    });
    expect(compiled()).toBe(`<p><label>label</label></p>`)
  });
})
