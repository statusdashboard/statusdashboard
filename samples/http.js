/**
 * HTTP Server for local test. Change the return status code on each request.
 * 'node samples/http' will start an HTTP server on port 3303. Override with PORT system env if needed.
 *
 * @author Christophe Hamerling - christophe.hamerling@gmail.com
 */

var express = require('express');
var app = express.createServer();

var port = process.env.PORT || 3303;

var random = [200, 202, 404, 500];

app.get('*', function(req, res) {
  var rand = Math.floor((Math.random()*random.length));
  res.send(random[rand]);
});

app.listen(port, function(err) {
  console.log('Started on port ', port);
})