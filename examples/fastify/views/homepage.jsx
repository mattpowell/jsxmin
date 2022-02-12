import { sleep } from './utils'
import GlobalLayout from './layout'

export default async (props) => {
  const start = Date.now();
  await sleep(100 * Math.random());
  return <GlobalLayout title={"Homepage"}>
    [{Date.now() - start}ms] Hello {props.name} 🏃‍♂️ 🏃‍♂️ 🏃‍♂️
  </GlobalLayout>;
}
