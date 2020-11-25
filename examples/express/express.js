const express = require('express');
const app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jsx');
app.engine('jsx', require('../../src/express')({

}));


app.get('/', (req, res) => {
  res.render('homepage', {
    name: req.query.name || 'world'
  });
})

app.listen(3000, () => {
  console.log(`Listening at http://localhost:3000/`)
})
