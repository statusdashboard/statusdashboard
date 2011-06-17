var http = require('http');
var https = require('https');
var net = require('net');
var sys = require('sys');
var fs = require('fs');
var logger = require('util');
var _ = require('underscore')._;
var settings = require('./settings').create();
var EventEmitter = require('events').EventEmitter;
var controller = new EventEmitter();
module.exports = controller;

var status = {};
status.last = new Date().toGMTString();
status.services = [];

updatingServices = function() {
  status.lastupdate = new Date().toUTCString();
  logger.log('Refreshing status board...');
  for (var i = 0; i < settings.services.length; i++) {
    status.services[i] = {};
    status.services[i].name = settings.services[i].name;
    status.services[i].label = settings.services[i].label;
    status.services[i].status = 'unknown';
    status.services[i].statusCode = 0;
    status.services[i].message = '';
    commands[settings.services[i].check].call(null, settings.services[i], status.services[i]);
  }
  setTimeout(function() {
    var statusTab = _.map(status.services, function(value, key) { return value; });
    status.summarize = {};
    status.summarize.lastupdate = status.lastupdate;
    status.summarize.up = _.reduce(_.select(_.map(status.services, function(value, key) { return value; }), function(data){ return data.status == 'up'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.critical = _.reduce(_.select(_.map(status.services, function(value, key) { return value; }), function(data){ return data.status == 'critical'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.down = _.reduce(_.select(_.map(status.services, function(value, key) { return value; }), function(data){ return data.status == 'down'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.unknown = _.reduce(_.select(_.map(status.services, function(value, key) { return value; }), function(data){ return data.status == 'unknown'; }), function(memo, num){ return memo + 1; }, 0);

    controller.emit("refresh", status);
  }, settings.serviceDelay);
};

var commands = {
  http : function(serviceDefinition, service) {
    var options = {
      host: serviceDefinition.host,
      port: serviceDefinition.port,
      path: serviceDefinition.path,
      headers: serviceDefinition.headers
    };

    http.get(options, function(response) {
      service.message = '';
      if (response.statusCode == 200) {
        service.status = "up";
      } else if (response.statusCode == 301 || response.statusCode == 302) {
        service.status = "unknown";
        service.message = "Redirected to " + response.headers.location;
      } else if (response.statusCode == 503 || response.statusCode == 404) {
        service.status = "down";
      } else {
        service.status = "critical";
      }
      service.statusCode = response.statusCode;
    })
    .on('error', function(e) {
      service.status = "down";
      service.statusCode = 0;
      service.message = e.message;
    });
  },
  https : function(serviceDefinition, service) {
    var options = {
      host: serviceDefinition.host,
      port: serviceDefinition.port,
      path: serviceDefinition.path,
    };

    https.get(options, function(response) {
      service.message = '';
        if (response.statusCode == 200) {
          service.status = "up";
        } else if (response.statusCode == 301 || response.statusCode == 302) {
          service.status = "unknown";
          service.message = "Redirected to " + response.headers.location;
        } else if (response.statusCode == 503 || response.statusCode == 404) {
          service.status = "down";
        } else {
          service.status = "critical";
        }
      service.statusCode = response.statusCode;
    })
    .on('error', function(e) {
      service.status = "down";
      service.statusCode = 0;
      service.message = e.message;
    });
  },
  tcp : function(serviceDefinition, service) {
    var stream = net.createConnection(serviceDefinition.port, serviceDefinition.host);
    stream.addListener('data', function (buffer) {
      service.status = "up";
      service.statusCode = 0;
      service.message = "";
      stream.end();
    });
    stream.addListener('connect', function () {
      stream.write(serviceDefinition.cmd);
    });
    stream.addListener('end', function () {
      stream.end();
    });
    stream.addListener('error', function (e) {
      service.status = "down";
      service.statusCode = e.errno;
      service.message = e.message;
    });
  },
  ftp : function(serviceDefinition, service) {
    service.status = "unknown";
    service.statusCode = 0;
    service.message = 'FTP check in progress...';

    var stream = net.createConnection(serviceDefinition.port, serviceDefinition.host);

    stream.addListener('connect', function () {
      var ftpCommand = function(command, callback) {
        stream.write(command + '\r\n');
        var dataCallback = function(data) {
          stream.removeListener('data', dataCallback);
          var status = data.toString().match(/^\d\d\d/);
          if (parseInt(status[0]) > 399) {
            ftpError(status[0], data.toString());
          } else {
            return callback(data);
          }
        };
        stream.addListener('data', dataCallback);
      };

      ftpCommand('USER ' + service.username, function(data) {
        ftpCommand('PASS ' + service.password, function(data) {
          service.status = "up";
          service.statusCode = 0;
          service.message = "";
        });
      });
    });

    var ftpError = function(status, message) {
      service.status = "down";
      service.statusCode = status;
      service.message = message;
    };

    stream.addListener('error', function (e) {
      service.status = "down";
      service.statusCode = 0;
      service.message = e.message;
    });

  },
  pidfile : function(serviceDefinition, service) {
    service.status = "unknown";
    service.statusCode = 0;
    service.message = '';
    try {
      var pid = fs.readFileSync(serviceDefinition.pidfile);
    } catch (e) {
      service.status = "unknown";
      service.statusCode = e.errno;
      service.message = e.message;
      return;
    }
    try {
      process.kill(pid, 0);
      service.status = "up";
      service.statusCode = 0;
      service.message = '';
    } catch (e) {
      service.status = "down";
      service.statusCode = e.errno;
      service.message = e.message;
      return;
    }
  }
};

setInterval(updatingServices, settings.serviceInterval);
updatingServices();

exports.services = function(req, res) {
  res.send(200, {}, JSON.stringify(status));
};

exports.servicesElement = function(req, res, value) {
  res.send(200, {}, JSON.stringify(status.services[value]));
};

exports.getServicesElement = function(value) {
  return status.services[value];
};

module.exports.getStatus = function() {
  return status;
};

