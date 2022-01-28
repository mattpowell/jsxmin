const GlobalLayout = require('./layout');

const sleep = (n) => new Promise(resolve => setTimeout(() => resolve(), n));

module.exports = async (props) => {
  const start = Date.now();
  const Timestamp = () => <>[{Date.now() - start}ms]</>
  await sleep(100 * Math.random());
  return <GlobalLayout title={"Homepage"}>
    <Timestamp/> Hello {props.name}
  </GlobalLayout>;
}
