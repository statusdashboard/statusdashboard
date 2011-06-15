var http = require('http');
var https = require('https');
var net = require('net');
var logger = require('util');
var settings = require('./settings').create();
var EventEmitter = require('events').EventEmitter;
var controller = new EventEmitter();
module.exports = controller;

var status = {};
status.last = new Date().toGMTString();
status.services = settings.services;

updatingServices = function() {
  status.lastupdate = new Date().toUTCString();
  logger.log('Refreshing status board...');
  for (var i = 0; i < status.services.length; i++) {
    commands[status.services[i].check].call(null, status.services[i]);
  }
  setTimeout(function() {
    controller.emit("refresh", status);
  }, 250);
};

var commands = {
  http : function(service) {
    var options = {
      host: service.host,
      port: service.port,
      path: service.path,
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
  https : function(service) {
    var options = {
      host: service.host,
      port: service.port,
      path: service.path,
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
  tcp : function(service) {
    var stream = net.createConnection(service.port, service.host);
    stream.addListener('data', function (buffer) {
      service.status = "up";
      service.statusCode = 0;
      service.message = "";
      stream.end();
    });
    stream.addListener('connect', function () {
      stream.write(service.cmd);
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
  ftp : function(service) {
    service.status = "unknown";
    service.statusCode = 0;
    service.message = 'FTP check in progress...';

    var stream = net.createConnection(service.port, service.host);

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

  }
};

setInterval(updatingServices, 20000);
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

