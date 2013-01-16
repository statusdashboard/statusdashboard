var util = require('util'),
    fs = require('fs'),
    logger = require('util'),
    _ = require('underscore')._,
    humanized_time_span = require(__dirname + '/lib/humanized_time_span.js'),
    EventEmitter = require('events').EventEmitter,
    controller = new EventEmitter();

/**
  Set this module as an express.js controller
*/
module.exports = controller;

/**
  Setup and configuration helper. Should be called once
*/
var settings;
var sources = {};

module.exports.setup = function (settings) {

  module.exports.configure(settings);

  /**
    Load available plugins
  */
  fs.readdir(__dirname + '/plugins', function(err, pluginDirectories) {
    if (!err) {
      _.each(pluginDirectories, function(directory) {
        if (fs.statSync(__dirname + '/plugins/' + directory).isDirectory() && fs.statSync(__dirname + '/plugins/' + directory + '/' + directory + '_plugin.js').isFile()) {
          return require(__dirname + '/plugins/' + directory + '/' + directory + '_plugin.js').create(controller, settings);
        } else {
          logger.log("Excluding plugin: " + directory);
        }
      });
    } else {
      logger.log("Error when creating plugin: " + err);
    }
  });

  /**
    Load available sources
  */

  sourceFiles = fs.readdirSync(__dirname + '/lib/sources');

  _.each(sourceFiles, function(source) {
    source = source.substr(0, source.length - 3);
    sources[source] = require(__dirname + '/lib/sources/' + source).check;
  });
};

/**
  Configuration manipulations helpers
*/
module.exports.configure = function (s) {
  settings = s;
};

module.exports.addService = function (serviceCfg) {
  logger.log('Adding new service: ' + serviceCfg.name);
  module.exports.removeService(serviceCfg.name);
  settings.services.push(serviceCfg);
};

module.exports.removeService = function (name) {
  for (var i = 0; i < settings.services.length; i++) {
    if (settings.services[i].name === name) {
      settings.services.splice(i, 1);
      return true;
    }
  }

  return false;
};

/**
    Updating Service display at a given interval
*/
var status = {};
status.lastupdate = new Date().toGMTString();
status.services = [];

module.exports.checkAllServices = function() {
  status.lastupdate = new Date().toUTCString();

  logger.log('Refreshing status board...');

  /**
    Update the service status object, check the service
  */
  for (var i = 0; i < settings.services.length; i++) {
    status.services[i] = {};
    status.services[i].name = settings.services[i].name;
    status.services[i].label = settings.services[i].label;
    status.services[i].status = 'unknown';
    status.services[i].statusCode = 0;
    status.services[i].message = '';

    sources[settings.services[i].check].call(null, settings.services[i], status.services[i], controller.emit);
  }

  /**
    There should be something more elegant to do here than to double schedule...
  */
  setTimeout(function() {
    var statusTab = _.map(status.services, function(value, key) { return value; });

    status.summarize = {};
    status.summarize.lastupdate = status.lastupdate;
    status.summarize.up = _.reduce(_.select(status.services, function(data){ return data.status == 'up'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.critical = _.reduce(_.select(status.services, function(data){ return data.status == 'critical'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.down = _.reduce(_.select(status.services, function(data){ return data.status == 'down'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.unknown = _.reduce(_.select(status.services, function(data){ return data.status == 'unknown'; }), function(memo, num){ return memo + 1; }, 0);

    controller.emit("refresh", status);
  }, settings.serviceDelay);
};

module.exports.startChecking = function () {
  module.exports.serviceCheckIntervalPointer = setInterval(module.exports.checkAllServices, settings.serviceInterval);
  module.exports.checkAllServices();
};

module.exports.stopChecking = function () {
  clearInterval(module.exports.serviceCheckIntervalPointer);
};

/**
    Returns a list of available services
*/
module.exports.services = function(req, res) {
  res.send(JSON.stringify(status), 200);
};

module.exports.servicesElement = function(req, res, value) {
  res.send(JSON.stringify(_.first(_.select(status.services, function(data){
      return data.name == value;
  }))), 200);
};

/**
  Summary report
*/
module.exports.summarize = function(req, res) {
  res.send({
      up: status.summarize.up,
      critical: status.summarize.critical,
      down: status.summarize.down,
      unknown: status.summarize.unknown
  }, 200);
};

exports.getServicesElement = function(value) {
  return status.services[value];
};

module.exports.configClient = function(req, res) {
  res.send(JSON.stringify(settings.client), 200);
};

module.exports.pluginsClient = function(req, res) {
  var plugins = _.map(_.select(_.map(settings.plugins, function(num, key) {
    return { name:key, enable: num.enable, client: num.client }; }
  ), function(data) {
    return (data.enable === true && data.client === true);
  }),
  function(num, key) {
    return { name:num.name };
  });

  res.send(JSON.stringify(plugins), 200);
};

/**
  Give access to the whole status object
*/
module.exports.getStatus = function() {
  return status;
};

/**
  Advertise uptime in human-readable format
*/
var startupTime = new Date().valueOf();
var date_formats = {
  past: [
    { ceiling: 60, text: "$seconds seconds ago" },
    { ceiling: 3600, text: "$minutes minutes and $seconds seconds ago" },
    { ceiling: 86400, text: "$hours hours, $minutes minutes and $seconds seconds ago" },
    { ceiling: 2629744, text: "$days days, $hours hours, $minutes minutes and $seconds seconds ago" },
    { ceiling: 31556926, text: "$months months, $days days, $hours hours, $minutes minutes and $seconds seconds ago" },
    { ceiling: null, text: "$years years ago, $months months, $days days, $hours hours, $minutes minutes and $seconds seconds" }
  ],
  future: [
    { ceiling: 60, text: "in $seconds seconds" },
    { ceiling: 3600, text: "in $minutes minutes" },
    { ceiling: 86400, text: "in $hours hours" },
    { ceiling: 2629744, text: "in $days days" },
    { ceiling: 31556926, text: "in $months months" },
    { ceiling: null, text: "in $years years" }
  ]
};

module.exports.uptime = function(req, res) {
  var now = new Date().valueOf();
  var uptime = now - startupTime;
  var human = humanized_time_span.humanized_time_span(startupTime, now, date_formats);
  res.send({ startupTime: startupTime, now: now, uptime: uptime, human: human}, 200);
};

/**
  Advertise application information
*/
var pkginfo = require('pkginfo')(module, 'name', 'version', 'description');
var info = { description: module.exports.description, name: module.exports.name, version: module.exports.version };

module.exports.info = function(req, res) {
  res.send(info, 200);
};

