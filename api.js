var http = require('http');
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
      if (response.statusCode == 200) {
        service.status = "up";
      } else {
        if (response.statusCode == 503 || response.statusCode == 404) {
          service.status = "down";
        } else {
          service.status = "critical";
        }
      }
      service.statusCode = response.statusCode;
      service.message = '';
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
  }
};

setInterval(updatingServices, 10000);
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

