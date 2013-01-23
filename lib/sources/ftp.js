/**
  TODO: Make it inherit TCP transport?
*/

var net = require('net');

var Ftp = function (service, stream, callback) {
  this.service = service;
  this.stream = stream;

  /**
    Actually required to get the SERVER READY out of the way
    I am also assuming this might catch potential
    on-connection ftp error
    codes...
  */
  this.command('', callback);
};

Ftp.prototype.command = function(command, callback) {

  this.stream.write(command + '\r\n');

  this.stream.once('data', function(data) {

    var status = data.toString().match(/^\d\d\d/);

    status = status[0] ? parseInt(status[0], 10) : 0;

    /**
      TODO?

      4xx and 5xx should be treated differently. 4xx should be critical,
      while 5xx should be (potentially) considered as down

      Removed 600 from potential error responses
    */
    if ((status > 399 && status < 600) || status > 999) {
      return callback(status, data.toString());
    }

    return callback(null, data.toString());
  });
};

Ftp.prototype.returnServiceStatus = function(service, status, statusCode, message, callback) {
  service.status = status;
  service.statusCode = statusCode;
  service.message = message;

  this.stream.end();
  this.stream.destroy();

  callback(service.status, service);
};

exports.check = function(serviceDefinition, service, callback) {

  service.status = "unknown";
  service.statusCode = 0;
  service.message = 'FTP check in progress...';

  var stream = net.createConnection(serviceDefinition.port, serviceDefinition.host);

  stream.addListener('connect', function () {

    var ftp = new Ftp(service, stream, function (err, data) {

      if (err) {
        return ftp.returnServiceStatus(service, 'down', err, data, callback);
      }

      ftp.command('USER ' + serviceDefinition.username, function(err, data) {

        if (err) {
          return ftp.returnServiceStatus(service, 'critical', err, data, callback);
        }

        ftp.command('PASS ' + serviceDefinition.password, function(err, data) {
          if (err) {
            return ftp.returnServiceStatus(service, 'critical', err, data, callback);
          }

          return ftp.returnServiceStatus(service, 'up', 0, '', callback);
        });
      });
    });
  });

  stream.addListener('error', function (e) {
    service.status = 'down';
    service.statusCode = 0;
    service.message = e.message;

    return callback(service.status, service);
  });
};
