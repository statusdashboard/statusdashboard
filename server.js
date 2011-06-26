var logger = require('util');
var http = require('http');
var journey = require('journey');
var router = new(journey.Router)();
var static = require('node-static');

// settings
var settings = require('./settings').create();
var api = require('./api');
// router
router.get(/^\/api\/services$/).bind(api.services);
router.get(/^\/api\/services\/([a-z\-]+)$/).bind(api.servicesElement);
router.get(/^\/api\/summarize$/).bind(api.summarize);

// static
var files = new (static.Server)('./public');

// server
var server = http.createServer(function(req, res) {
  var body = '';
  req.on('data', function(chunk) { 
    body += chunk; 
  });
  req.on('end', function() {
    router.handle(req, body, function (route) {
      if (route.status === 404) {
        files.serve(req, res, function (err, result) {
          if (err && (err.status === 404)) { 
            res.writeHead(404);
            res.end('File not found.');
          }
        });
        return;
      }
      res.writeHead(route.status, route.headers);
      res.end(route.body);
    });
  });
});
server.listen(settings.port, settings.hostname);

var count = 0;
var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
  count++;
  logger.log('New client connected! (' + count + ')');
  socket.emit('title', settings.title);
  socket.emit('status', api.getStatus());
  socket.broadcast.emit('count', count);

  socket.on('disconnect', function() {
    count--;
    socket.broadcast.emit('count', count);
  });
  api.on("refresh", function(status) {
    socket.emit('status', status);
  });
});

logger.log('Server started.');
logger.log('Server running at http://' + settings.hostname + ':' + settings.port);

