var util = require('util');
var http = require('http');
var journey = require('journey');
var router = new(journey.Router)();
var paperboy = require('paperboy');
var url = require('url');
var _ = require('underscore')._;

process.on('exit', function () {
  util.log('Bye bye Statusdashboard.');
});

process.on('uncaughtException', function(err) {
  util.log(err);
});

String.prototype.startsWith = function(str) {
    return (this.indexOf(str) === 0);
}

// settings
var settings = require('./settings').create();
var api = require('./api');
// router
router.get(/^\/api\/services$/).bind(api.services);
router.get(/^\/api\/services\/([a-z\-]+)$/).bind(api.servicesElement);
router.get(/^\/api\/summarize$/).bind(api.summarize);
router.get(/^\/api\/config\/client$/).bind(api.configClient);
router.get(/^\/api\/plugins\/client$/).bind(api.pluginsClient);
router.get(/^\/api\/uptime$/).bind(api.uptime);
router.get(/^\/api\/info$/).bind(api.info);

// static
var docRoot = __dirname + '/public';
var pluginsDocRoot = [];

// server
var port = process.env.PORT || settings.port;
var server = http.createServer(function(req, res) {
  var body = '';
  req.on('data', function(chunk) { 
    body += chunk; 
  });
  req.on('end', function() {
    router.handle(req, body, function (route) {
      if (route.status === 404) {
        paperboy.deliver(docRoot, req, res).otherwise(function(err) {
          var pathname = url.parse(req.url).pathname;
          var pluginDocRootSelect = _.select(pluginsDocRoot, function(data) { return pathname.toString().startsWith(data.prefix); });
          if (pluginDocRootSelect && pluginDocRootSelect[0]) {
            var pluginDocRoot = pluginDocRootSelect[0];
            req.url = pathname.toString().replace(pluginDocRoot.prefix, "");
            paperboy.deliver(pluginDocRoot.docRoot, req, res).otherwise(function(err) {
              res.writeHead(404);
              res.end('File not found.');
            });
          } else {
            res.writeHead(route.status, route.headers);
            res.end(route.body);
          }
        });
      } else {
        res.writeHead(route.status, route.headers);
        res.end(route.body);
      }
    });
  });
});
server.listen(port, settings.hostname);

var count = 0;
var io = require('socket.io').listen(server);

// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
io.enable('browser client minification');
io.enable('browser client etag');
io.set('log level', 1);

io.sockets.on('connection', function(socket) {
  count++;
  util.log('New client connected! (' + count + ')');
  socket.emit('title', settings.title);
  socket.emit('status', api.getStatus());
  io.sockets.emit('count', count);

  socket.on('disconnect', function() {
    count--;
    util.log('Client disconnect! (' + count + ')');
    socket.broadcast.emit('count', count);
  });
});

api.on("refresh", function(status) {
  io.sockets.emit('status', status);
});

api.on("routeContribution", function(route) {
  router.route(route.method, route.path).bind(route.binding);
});

api.on("staticContribution", function(plugin) {
  util.log("Add static contribution: " + plugin);
  var docRoot = __dirname + '/plugins/' + plugin + '/public';
  pluginsDocRoot.push( { prefix: "/api/" + plugin, docRoot: docRoot });
  util.log("Add static contribution: " + util.inspect(pluginsDocRoot));
});

util.log('Server started.');
util.log('Server running at http://' + settings.hostname + ':' + port);

