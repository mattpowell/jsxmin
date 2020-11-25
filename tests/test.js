const Jsxmin = require('../src/jsxmin');

describe('Basic', () => {
  it('Should handle basic html', async () => {
    const tmpl = await Jsxmin.run(`() => <div>Hello world.</div>`);
    expect(tmpl()).toBe(`<div>Hello world.</div>`)
  });

  it('Should handle basic html with interpolation', async () => {
    const tmpl = await Jsxmin.run(`(props) => <div>Hello {props.name}.</div>`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello you.</div>`)
  });

  it('Should handle basic html with interpolation and expression', async () => {
    const tmpl = await Jsxmin.run(`(props) => <div>Hello {props.name || 'world'}.</div>`);
    expect(tmpl({})).toBe(`<div>Hello world.</div>`)
  });

  it('Should handle basic partials', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const Name = () => <strong>world</strong>;
      return <div>Hello <Name/>.</div>
    }`);
    expect(tmpl({})).toBe(`<div>Hello <strong>world</strong>.</div>`)
  });

  it('Should handle basic partials with params', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const Name = (props) => <strong>{props.val}</strong>;
      return <div>Hello <Name val={props.name}/>.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle basic string partials', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const Name = <strong>{props.name}</strong>;
      return <div>Hello <Name/>.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle basic string partials as interpolation', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const Name = <strong>{props.name}</strong>;
      return <div>Hello {Name}.</div>
    }`);
    expect(tmpl({
      name: 'you'
    })).toBe(`<div>Hello <strong>you</strong>.</div>`)
  });

  it('Should handle fragments', async () => {
    const tmpl = await Jsxmin.run(`() => <>this is some text</>`);
    expect(tmpl()).toBe(`this is some text`)
  });

  it('Should handle basic expressions', async () => {
    const tmpl = await Jsxmin.run(`(props) => <>before: {props.count}, after: {props.count + 1}</>`);
    expect(tmpl({
      count: 1
    })).toBe(`before: 1, after: 2`)
  });

  it('Should handle children', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const Wrapper = props => <div class="wrapper">{props.children}</div>; 
      return <div><Wrapper>{props.label}</Wrapper></div>
    }`);
    expect(tmpl({
      label: 'wrapped'
    })).toBe(`<div><div class="wrapper">wrapped</div></div>`)
  });

  it('Should run tagnames if they\'re functions', async () => {
    const tmpl = await Jsxmin.run(`
      const Label = ({value}) => <strong>{value}</strong>;
      (props) => <Label value={props.name}/>
    `);
    expect(tmpl({
      name: 'Testing'
    })).toBe(`<strong>Testing</strong>`)
  });

  it('Should escape prop names passed to functions', async () => {
    const tmpl = await Jsxmin.run(`
      const Label = (props) => <strong>{props['data-id']}</strong>;
      (props) => <Label data-id={1}/>
    `);
    expect(tmpl({})).toBe(`<strong>1</strong>`)
  });
});


describe('Advanced', () => {
  it('Shouldn\'t coerce tagNames within variable declarations', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const button = props.button && <button>{props.button}</button> || ''
      return <div>{button}</div>
    }`);
    expect(tmpl({
      button: 'button label'
    })).toBe(`<div><button>button label</button></div>`)
  });

  it('Should reference scoped variables', async () => {
    const tmpl = await Jsxmin.run(`
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
      const tmpl = await Jsxmin.run(`
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

  // fit('Should support destructuring in function declarations', async () => {
  //   const tmpl = await Jsxmin.run(`
  //     const strong = ({value}) => <strong>{value}</strong>;
  //     strong;
  //   `);
  //   expect(tmpl({
  //     value: 'TEST!'
  //   })).toBe(`<strong>TEST!</strong>`)
  // })
});

describe('Control flows and structures', () => {
  it('Basic conditional', async () => {
    const tmpl = await Jsxmin.run(`(props) => {
      const If = ({condition, children}) => condition ? children : '';
      return <div>Hello <If condition={props.name.toLowerCase() === 'world'}>WORLD!!</If></div>
    }`);
    expect(tmpl({
      name: 'world'
    })).toBe(`<div>Hello WORLD!!</div>`)
  })
});


describe('Options', () => {
  it('enableOutputSimplification=false', async () => {
    const compiled = await Jsxmin.transpileSource(`<div>Hello</div>`, {
      enableOutputSimplification: false
    });
    expect(compiled).toBe(`"<" + "div" + ">" + "Hello" + "</div>";`)
  });
  it('enableOutputSimplification=true', async () => {
    const compiled = await Jsxmin.transpileSource(`<div>Hello</div>`, {
      enableOutputSimplification: true
    });
    expect(compiled).toBe(`"<div>" + "Hello" + "</div>";`)
  });
  it('useWhitespace', async () => {
    const compiled = await Jsxmin.run(`const p = (props) => <span>{props.children}</span>; <><p><a>1</a><a>2</a></p></>`, {
      useWhitespace: true
    });
    expect(compiled).toBe(`<span><a>1</a> <a>2</a></span>`)
  });
  it('allowReferencesAsFunctions', async () => {
    const compiled = await Jsxmin.run(`const label = () => <>HELLO WORLD</>; <p>{label}</p>`, {
      allowReferencesAsFunctions: true
    });
    expect(compiled).toBe(`<p>HELLO WORLD</p>`)
  });
  it('allowScopedParameterAccess=true', async () => {
    const compiled = await Jsxmin.run(`const label = ({name = 'default'} = {}) => <>{name}</>; (props) => <p>{label}</p>`, {
      allowScopedParameterAccess: true
    });
    expect(compiled({
      name: 'hello world'
    })).toBe(`<p>hello world</p>`)
  });
  it('allowScopedParameterAccess=false', async () => {
    const compiled = await Jsxmin.run(`const label = ({name = 'default'} = {}) => <>{name}</>; (props) => <p>{label}</p>`, {
      allowScopedParameterAccess: false
    });
    expect(compiled({
      name: 'hello world'
    })).toBe(`<p>default</p>`)
  });
})
