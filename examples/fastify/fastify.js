const jsxMin = require('../../src/fastify');

const fastify = require('fastify')({
  logger: true
})

fastify.register(jsxMin, {
  views: __dirname + '/views',
  additionalBabelPlugins: [ '@babel/plugin-transform-modules-commonjs' ],
  extensions: ['.js', '.jsx'],
  opts: {
    enableOutputSimplification: true,
    transformEsmAsCjs: true
  }
})

fastify.get('/', function (req, reply) {
  reply.view('homepage', { name: req.query.name || 'world' })
})

fastify.listen(3000, function (err, address) {
  fastify.log.info(`Listening on ${address}`)
})
