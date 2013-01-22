/**
  TODO: Make it inherit TCP transport?
*/

var net = require('net');

var Ftp = function (service, stream) {
  this.service = service;
  this.stream = stream;
};

Ftp.prototype.error = function(status, message) {
  this.service.status = "down";
  this.service.statusCode = status;
  this.service.message = message;
  callback(this.service.status, this.service);
};

Ftp.prototype.command = function(command, callback) {

  var self = this;
  this.stream.write(command + '\r\n');

  var dataCallback = function(data) {
    self.stream.removeListener('data', dataCallback);

    var status = data.toString().match(/^\d\d\d/);

    if (parseInt(status[0], 10) > 399) {
      ftp.error(self.service, status[0], data.toString());
    } else {
      return callback(data);
    }
  };

  self.stream.addListener('data', dataCallback);
};

exports.check = function(serviceDefinition, service, callback) {

  service.status = "unknown";
  service.statusCode = 0;
  service.message = 'FTP check in progress...';

  var stream = net.createConnection(serviceDefinition.port, serviceDefinition.host);

  stream.addListener('connect', function () {
    var ftp = new Ftp(service, stream);

    ftp.command('USER ' + service.username, function(data) {
      ftp.command('PASS ' + service.password, function(data) {
        service.status = "up";
        service.statusCode = 0;
        service.message = "";
        callback(service.status, service);
      });
    });
  });

  stream.addListener('error', function (e) {
    service.status = "down";
    service.statusCode = 0;
    service.message = e.message;
    callback(service.status, service);
  });
};
