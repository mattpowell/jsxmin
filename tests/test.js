const Jsxmin = require('../src/jsxmin');

describe('Basic', () => {
  it('Should handle basic html', () => {
    const tmpl = Jsxmin.execute(`() => <div>Hello world.</div>`);
    expect(tmpl()).toBe(`<div>Hello world.</div>`)
  });

  it('Should support async functions', async () => {
    const tmpl = Jsxmin.execute(`
      const sleep = (n) => new Promise(resolve => setTimeout(() => resolve(), n)); 
      async () => {
        await sleep(1000);
        return <div>Hello world.</div>
      }
    `);
    expect(await tmpl()).toBe(`<div>Hello world.</div>`)
  });

  it('Should handle basic html with attributes', () => {
    // TODO: fix this!
    const tmpl = Jsxmin.execute(`() => <div id="main" selected>Hello world.</div>`);
    expect(tmpl()).toBe(`<div id="main" selected="selected">Hello world.</div>`)
  });

  it('Should handle basic html with interpolation', () => {
    const tmpl = Jsxmin.execute(`(props) => <div>Hello {props.name}.</div>`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello you.</div>`)
  });

  it('Should handle basic html with interpolation and expression', () => {
    const tmpl = Jsxmin.execute(`(props) => <div>Hello {props.name || 'world'}.</div>`);
    expect(tmpl({})).toBe(`<div>Hello world.</div>`)
  });

  it('Should handle basic partials', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const Name = () => <strong>world</strong>;
      return <div>Hello <Name/>.</div>
    }`);
    expect(tmpl({})).toBe(`<div>Hello <strong>world</strong>.</div>`)
  });

  it('Should handle basic partials with params', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const Name = (props) => <strong>{props.val}</strong>;
      return <div>Hello <Name val={props.name}/>.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle basic string partials', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const Name = <strong>{props.name}</strong>;
      return <div>Hello <Name/>.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle basic string partials as interpolation', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const Name = <strong>{props.name}</strong>;
      return <div>Hello {Name}.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle fragments', () => {
    const tmpl = Jsxmin.execute(`() => <>this is some text</>`);
    expect(tmpl()).toBe(`this is some text`)
  });

  it('Should handle basic expressions', () => {
    const tmpl = Jsxmin.execute(`(props) => <>before: {props.count}, after: {props.count + 1}</>`);
    expect(tmpl({
      count: 1
    })).toBe(`before: 1, after: 2`)
  });

  it('Should handle children', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const Wrapper = props => <div class="wrapper">{props.children}</div>; 
      return <div><Wrapper>{props.label}</Wrapper></div>
    }`);
    expect(tmpl({
      label: 'wrapped'
    })).toBe(`<div><div class="wrapper">wrapped</div></div>`)
  });

  it('Should run tagnames if they\'re functions', () => {
    const tmpl = Jsxmin.execute(`
      const Label = ({value}) => <strong>{value}</strong>;
      (props) => <Label value={props.name}/>
    `);
    expect(tmpl({
      name: 'Testing'
    })).toBe(`<strong>Testing</strong>`)
  });

  it('Should escape prop names passed to functions', () => {
    const tmpl = Jsxmin.execute(`
      const Label = (props) => <strong>{props['data-id']}</strong>;
      (props) => <Label data-id={1}/>
    `);
    expect(tmpl({})).toBe(`<strong>1</strong>`)
  });

  it('Should handle multiline strings', () => {
    const tmpl = Jsxmin.execute(`
      props => <p style="color: red;
                      background-color: blue;
                      font-size: 1em"
        >Text.</p>;
    `, {
      enableOutputSimplification: false
    });
    expect(tmpl({})).toBe(`<p style="color: red;
                      background-color: blue;
                      font-size: 1em">Text.</p>`)
  });
});

describe('Advanced', () => {
  it('Shouldn\'t coerce tagNames within variable declarations', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const button = props.button && <button>{props.button}</button> || ''
      return <div>{button}</div>
    }`);
    expect(tmpl({
      button: 'button label'
    })).toBe(`<div><button>button label</button></div>`)
  });

  it('Should reference scoped variables', () => {
    const tmpl = Jsxmin.execute(`
      const Label = props => <strong>{props.value}</strong>;
      (function() {
        return (props) => <div><Label value={props.label}/></div>
      })()
    `);
    expect(tmpl({
      label: 'test'
    })).toBe(`<div><strong>test</strong></div>`)
  });

  it('Should reference deeply nested scoped variables', () => {
    let errMsg = '';
    try {
      const tmpl = Jsxmin.execute(`
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

  // fit('Should support destructuring in function declarations', () => {
  //   const tmpl = Jsxmin.execute(`
  //     const strong = ({value}) => <strong>{value}</strong>;
  //     strong;
  //   `);
  //   expect(tmpl({
  //     value: 'TEST!'
  //   })).toBe(`<strong>TEST!</strong>`)
  // })
});

describe('Control flows and structures', () => {
  it('Basic conditional', () => {
    const tmpl = Jsxmin.execute(`(props) => {
      const If = ({condition, children}) => condition ? children : '';
      return <div>Hello <If condition={props.name.toLowerCase() === 'world'}>WORLD!!</If></div>
    }`);
    expect(tmpl({
      name: 'world'
    })).toBe(`<div>Hello WORLD!!</div>`)
  })
});


describe('Options', () => {
  it('enableOutputSimplification=false', () => {
    const compiled = Jsxmin.transform(`<div>Hello</div>`, {
      enableOutputSimplification: false
    });
    expect(compiled).toBe(`"<" + "div" + ">" + "Hello" + "</div>";`)
  });
  it('enableOutputSimplification=true', () => {
    const compiled = Jsxmin.transform(`<div>Hello</div>`, {
      enableOutputSimplification: true
    });
    expect(compiled).toBe(`"<div>" + "Hello" + "</div>";`)
  });
  it('useWhitespace', () => {
    const compiled = Jsxmin.execute(`const p = (props) => <span>{props.children}</span>; <><p><a>1</a><a>2</a></p></>`, {
      useWhitespace: true
    });
    expect(compiled).toBe(`<span><a>1</a> <a>2</a></span>`)
  });
  it('allowReferencesAsFunctions', () => {
    const compiled = Jsxmin.execute(`const label = () => <>HELLO WORLD</>; <p>{label}</p>`, {
      allowReferencesAsFunctions: true
    });
    expect(compiled).toBe(`<p>HELLO WORLD</p>`)
  });
  it('allowScopedParameterAccess=true', () => {
    const compiled = Jsxmin.execute(`const label = ({name = 'default'} = {}) => <>{name}</>; (props) => <p>{label}</p>`, {
      allowScopedParameterAccess: true
    });
    expect(compiled({
      name: 'hello world'
    })).toBe(`<p>hello world</p>`)
  });
  it('allowScopedParameterAccess=false', () => {
    const compiled = Jsxmin.execute(`const label = ({name = 'default'} = {}) => <>{name}</>; (props) => <p>{label}</p>`, {
      allowScopedParameterAccess: false
    });
    expect(compiled({
      name: 'hello world'
    })).toBe(`<p>default</p>`)
  });
})
