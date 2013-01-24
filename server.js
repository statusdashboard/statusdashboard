var path = require('path'),
    url  = require('url'),
    _    = require('underscore')._;

var log;

exports.dashboard = function(settings, cb) {
  var rootPath = path.dirname(module.filename),
      api      = require('./api'),
      express  = require('express'),
      app      = express.createServer();

  log = settings.logger ? settings.logger : require('util').log;
  /**
    Express app definition

    This application is the main front end. It serves the required statif files,
    and connects the API calls to an HTTP server
  */
  app.configure(function () {
    var staticPath = path.join(rootPath, 'public');

    log("Express server static directory: " + staticPath);

    app.use(express['static'].call(null, staticPath));
    app.use(express.favicon(path.join(staticPath, 'favicon.ico')));
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
  });

  app.listen(settings.port, settings.hostname);

  log('Server running at http://' + settings.hostname + ':' + settings.port);

  /**
    Routes are connected to the api, and an extra route is added for self-health checking
  */
  app.get(/^\/api\/services$/, api.services);
  app.get(/^\/api\/services\/([a-z\-]+)$/, api.servicesElement);
  app.get(/^\/api\/summarize$/, api.summarize);
  app.get(/^\/api\/config\/client$/, api.configClient);
  app.get(/^\/api\/plugins\/client$/, api.pluginsClient);
  app.get(/^\/api\/uptime$/, api.uptime);
  app.get(/^\/api\/info$/, api.info);

  app.get('/healthCheck', function(req, res) {
    res.send('ok', 200);
  });

  /**
    Socket.IO configuration

    The main goal of this path is to share information about who is connected,
    and to make it possible to receive status updates in real-time.

    https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
  */
  var count = 0;
  var io = require('socket.io').listen(app);

  io.configure(function () {
    io.enable('browser client minification');
    io.enable('browser client etag');
    io.set('log level', 1);
  });

  io.sockets.on('connection', function(socket) {

    count++;
    log('New client connected! (' + count + ')');

    socket.emit('title', settings.title);
    socket.emit('status', api.getStatus());

    io.sockets.emit('count', count);

    socket.on('disconnect', function() {
      count--;
      log('Client disconnect! (' + count + ')');
      socket.broadcast.emit('count', count);
    });
  });

  /**
    API event handling

    The following events are of interest to us:

    * routeContribution:
    * postRouteContribution:
    * staticContribution:
    * refresh: when we get new data, pass it to the front-end client
  */
  api.setup(settings);

  api.on("routeContribution", function(route) {
    app.get(route.path, route.binding);
    log("Add GET route contribution: " + route.path);
  });

  api.on("postRouteContribution", function(route) {
    app.post(route.path, route.binding);
    log("Add POST route contribution: " + route.path);
  });

  api.on("staticContribution", function(plugin) {
    var docRoot = __dirname + '/plugins/' + plugin + '/public';
    app.use("/api/" + plugin, express['static'].call(null, docRoot));
    log("Add static contribution: " + plugin + ", " + docRoot);
  });

  api.on("refresh", function(status) {
    io.sockets.emit('status', status);
  });

  api.startChecking();

  // We make the API available for external control
  this.api = api;
  log('Server started.');
  if (cb) cb();
};
