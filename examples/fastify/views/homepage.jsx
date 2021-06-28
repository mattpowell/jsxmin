const GlobalLayout = require('./layout');

module.exports = (props) => {
  return <GlobalLayout title={"Homepage"}>
    Hello {props.name} 🏃‍♂️ 🏃‍♂️ 🏃‍♂️
  </GlobalLayout>;
}
