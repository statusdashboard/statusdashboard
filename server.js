var path = require('path');
var util = require('util');
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

// Directories
var rootPath = process.cwd();
var staticPath = path.join(rootPath, 'public');

// Settings
var settings = require('./settings').create();
var api = require('./api');

// Server
var express = require('express')
var app = express.createServer();
app.configure(function () {
  util.log("Express server static directory: " + staticPath);
  app.use(express.static(staticPath));
  app.use(express.favicon(path.join(staticPath, 'favicon.ico')));
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
});
var port = process.env.PORT || settings.port;
app.listen(port, settings.hostname);
util.log('Server running at http://' + settings.hostname + ':' + port);

// Routes
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

api.on("routeContribution", function(route) {
  app.get(route.path, route.binding);
  util.log("Add route contribution: " + route.path);
});

api.on("staticContribution", function(plugin) {
  var docRoot = __dirname + '/plugins/' + plugin + '/public';
  app.use("/api/" + plugin, express.static(docRoot));
  util.log("Add static contribution: " + plugin + ", " + docRoot);
});

var count = 0;
var io = require('socket.io').listen(app);
// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
io.configure(function () {
  io.enable('browser client minification');
  io.enable('browser client etag');
  io.set('log level', 1);
});

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

util.log('Server started.');
