var http = require('http');
var https = require('https');
var net = require('net');
var fs = require('fs');
var dgram = require('dgram');
var Buffer = require('buffer').Buffer;
var logger = require('util');
var _ = require('underscore')._;
var settings = require('./settings').create();
var humanized_time_span = require(__dirname + '/lib/humanized_time_span.js');
var EventEmitter = require('events').EventEmitter;
var controller = new EventEmitter();
module.exports = controller;

var pkginfo = require('pkginfo')(module, 'name', 'version', 'description');
var info = { description: module.exports.description, name: module.exports.name, version: module.exports.version };

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
var checkStatusDashboardResponse = function(response, serviceDefinition, service) {
  if(response.statusCode === 200){
    response.on('data', function(chunk){
      summary = JSON.parse(chunk);
      if(summary.critical === 0 && summary.down === 0 && summary.unknown ===0){
        service.status = 'up';
      }else {
        service.status = 'down';
        service.message = "Services up: "+ summary.up + ", Services down: "+ summary.down + ", Services critical: "+summary.critical + ", Services unknown: "+summary.unknown; 
      }
      controller.emit(service.status, service);
    });
  }
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
      controller.emit(service.status, service);
    });
  } else {
    controller.emit(service.status, service);
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
      controller.emit(service.status, service);
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
      controller.emit(service.status, service);
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
      controller.emit(service.status, service);
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
      controller.emit(service.status, service);      
    });
  },
  udp : function(serviceDefinition, service) {
    var sock = dgram.createSocket("udp4");
    sock.on("message", function (buffer, from) {
      if (!serviceDefinition.rcv || serviceDefinition.rcv == buffer) {
        service.status = "up";
        service.statusCode = 0;
        service.message = "";
      } else {
        service.status = "critical";
        service.statusCode = 0;
        service.message = "Expected " + serviceDefinition.rcv + " but was '" + buffer;
      }
      sock.close();
      controller.emit(service.status, service);
    });
    sock.on("error", function (exception) {
      service.status = "down";
      service.statusCode = 0;
      service.message = exception;
      controller.emit(service.status, service);
      sock.close();
    });
    var buf = new Buffer(serviceDefinition.cmd);
    sock.send(buf, 0, buf.length, serviceDefinition.port, serviceDefinition.host);
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
          controller.emit(service.status, service);
        });
      });
    });

    var ftpError = function(status, message) {
      service.status = "down";
      service.statusCode = status;
      service.message = message;
      controller.emit(service.status, service);
    };

    stream.addListener('error', function (e) {
      service.status = "down";
      service.statusCode = 0;
      service.message = e.message;
      controller.emit(service.status, service);
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
        controller.emit(service.status, service);
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
        controller.emit(service.status, service);
        return;
      }
    }
    service.status = "up";
    controller.emit(service.status, service);
  },
  statusdashboard : function(serviceDefinition, service) {
    var options = {
      host: serviceDefinition.host,
      port: serviceDefinition.port,
      path: '/api/summarize'
    };
    http.get(options, function(response) {
      service.message = '';
      checkHttpStatusCode(response, service);
      checkStatusDashboardResponse(response, serviceDefinition, service);
    })
    .on('error', function(e) {
      service.status = "down";
      service.statusCode = 0;
      service.message = e.message;
      controller.emit(service.status, service);
    });
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

module.exports.configClient = function(req, res) {
  res.send(200, {}, JSON.stringify(settings.client));
}

module.exports.pluginsClient = function(req, res) {
  var plugins = _.map(_.select(_.map(settings.plugins, function(num, key) { return { name:key, enable: num.enable, client: num.client } }), function(data) { return (data.enable == true && data.client == true); }), function(num, key) { return { name:num.name } });
  res.send(200, {}, JSON.stringify(plugins));
}

module.exports.getStatus = function() {
  return status;
};

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
  res.send(200, {}, { startupTime: startupTime, now: now, uptime: uptime, human: human});
}

module.exports.info = function(req, res) {
  res.send(200, {}, info);
}

