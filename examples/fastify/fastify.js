const jsxMin = require('../../src/fastify');

const fastify = require('fastify')({
  logger: true
})

fastify.register(jsxMin, {
  views: __dirname + '/views'
})

fastify.get('/', function (req, reply) {
  reply.view('homepage', { name: req.query.name || 'world' })
})

fastify.listen(3000, function (err, address) {
  fastify.log.info(`Listening on ${address}`)
})
