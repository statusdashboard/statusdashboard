var logger = require('util');
var http = require('http');
var io = require('socket.io');
var journey = require('journey');
var router = new(journey.Router)();
var static = require('node-static');

// settings
var settings = require('./settings').create();
var api = require('./api');
// router
router.get(/^\/api\/services$/).bind(api.services);
router.get(/^\/api\/services\/([a-z\-]+)$/).bind(api.servicesElement);
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

var socket = io.listen(server);
socket.on('connection', function(client) {
    logger.log('New client connected: ' + client.sessionId);
    client.send({type: 'status', data: api.getStatus()});

    var callback = function(status) {
      client.send({type: 'status', data: status});
    };

    client.on('disconnect',function(){
      logger.log('Server has disconnected');
      api.removeListener("refresh", callback);
    });

    api.on("refresh", callback);
});

logger.log('Server started.');
logger.log('Server running at http://' + settings.hostname + ':' + settings.port);

