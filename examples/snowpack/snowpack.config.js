module.exports = {
  "plugins": [
    [
      "@snowpack/plugin-babel",
      {
        "input": [".js", ".jsx"],
        "transformOptions": {
          "plugins":  [["babel-plugin-jsxmin", {"enableOutputSimplification": true}]]
        }
      }
    ]
  ]
}
