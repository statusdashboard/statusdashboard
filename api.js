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
status.lastupdate = new Date().toGMTString();
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
    status.summarize.up = _.reduce(_.select(status.services, function(data){ return data.status == 'up'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.critical = _.reduce(_.select(status.services, function(data){ return data.status == 'critical'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.down = _.reduce(_.select(status.services, function(data){ return data.status == 'down'; }), function(memo, num){ return memo + 1; }, 0);
    status.summarize.unknown = _.reduce(_.select(status.services, function(data){ return data.status == 'unknown'; }), function(memo, num){ return memo + 1; }, 0);

    controller.emit("refresh", status);
  }, settings.serviceDelay);
};

var checkHttpStatusCode = function(response, service) {
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
};

var checkRange = function(min, max, value) {
  if (min && max && value >= min && value < max) {
    return true;
  } else if ( (min && value >= min) || (max && value < max) ) {
    return true;
  }
  return false;
};

var checkHttpValueResponse = function(response, serviceDefinition, service) {
  if (response.statusCode == 200 && (serviceDefinition.checkFixedValueResponse || serviceDefinition.checkRangeValuesResponse)) {
    response.on('data', function (chunk) {
      var value = ('' + chunk).substring(0, chunk.length - 1);
      if (serviceDefinition.checkFixedValueResponse) {
        if (serviceDefinition.checkFixedValueResponse[value]) {
          service.status = serviceDefinition.checkFixedValueResponse[value];
        } else {
          service.status = "critical";
          service.message = "Unexpected value " + value;
        }
      } else {
        if (serviceDefinition.checkRangeValuesResponse) {
          if (serviceDefinition.checkRangeValuesResponse.length == 0) {
            service.status = "critical";
            service.message = "No range defined!";
          } else {
            var found = false;
            for(var i = 0; i < serviceDefinition.checkRangeValuesResponse.length; i++) {
              var range = serviceDefinition.checkRangeValuesResponse[i];
              if (checkRange(range.min, range.max, parseInt(value))) {
                service.status = range.status;
                found = true;
                break;
              }
            }
            if (!found) {
              service.status = "critical";
              service.message = "No range matches";
            }
          }
        }
      }
    });
  }
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
      checkHttpStatusCode(response, service);
      checkHttpValueResponse(response, serviceDefinition, service);
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
      headers: serviceDefinition.headers
    };

    https.get(options, function(response) {
      service.message = '';
      checkHttpStatusCode(response, service);
      checkHttpValueResponse(response, serviceDefinition, service);
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
      if (!serviceDefinition.rcv || serviceDefinition.rcv == buffer) {
        service.status = "up";
        service.statusCode = 0;
        service.message = "";
      } else {
        service.status = "critical";
        service.statusCode = 0;
        service.message = "Expected " + serviceDefinition.rcv + " but was " + buffer;
      }
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
    var pidfiles = [serviceDefinition.pidfile];
    
    if (serviceDefinition.pidfile.constructor === Array) {
      pidfiles = serviceDefinition.pidfile;
    }
    for (var index = 0; index < pidfiles.length; index++) {
      try {
        var pid = fs.readFileSync(pidfiles[index]);
      } catch (e) {
        service.status = "unknown";
        service.statusCode = e.errno;
        service.message = e.message;
        return;
      }
      try {
        var pidInt = parseInt(pid);
        if (isNaN(pidInt)) {
          service.status = "critical";
          service.message = 'pid \'' + pid + '\' is not a number';
          return;
        } else {
          process.kill(pidInt, 0);
        }
      } catch (e) {
        service.status = "down";
        service.statusCode = e.errno;
        service.message = e.message;
        return;
      }
    }
    service.status = "up";
  }
};

setInterval(updatingServices, settings.serviceInterval);
updatingServices();

module.exports.services = function(req, res) {
  res.send(200, {}, JSON.stringify(status));
};

module.exports.servicesElement = function(req, res, value) {
  res.send(200, {}, JSON.stringify(_.first(_.select(status.services, function(data){ return data.name == value; }))));
};

module.exports.summarize = function(req, res) {
  res.send(200, {}, { up: status.summarize.up, critical: status.summarize.critical, down: status.summarize.down, unknown: status.summarize.unknown });
};

exports.getServicesElement = function(value) {
  return status.services[value];
};

module.exports.getStatus = function() {
  return status;
};

