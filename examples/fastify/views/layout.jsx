module.exports = async (props) => {
  return (
    <html>
      <head>
        <title>{props.title}</title>
      </head>
      <body>
        {...props.children}
      </body>
    </html>
  )
}
