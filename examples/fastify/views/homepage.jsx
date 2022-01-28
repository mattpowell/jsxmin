const GlobalLayout = require('./layout');

const sleep = (n) => new Promise(resolve => setTimeout(() => resolve(), n));

module.exports = async (props) => {
  const start = Date.now();
  await sleep(100 * Math.random());
  return <GlobalLayout title={"Homepage"}>
    [{Date.now() - start}ms] Hello {props.name} 🏃‍♂️ 🏃‍♂️ 🏃‍♂️
  </GlobalLayout>;
}
