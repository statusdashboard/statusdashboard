var net = require('net');

exports.check = function(serviceDefinition, service, callback) {

  /**
    Create a stream connection
  */
  var stream = net.createConnection(serviceDefinition.port, serviceDefinition.host);

  /**
    We wait for data. We expect to receive something which can either
    be checked or not against some buffer data.

    TODO: Would be interesting to allow a function instead of just checking on a buffer.
  */
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
    callback(service.status, service);
  });

  /**
    on connect, we send a command
  */
  stream.addListener('connect', function () {
    stream.write(serviceDefinition.cmd);
  });

  /**
    Close connection on close...
  */
  stream.addListener('end', function () {
    stream.end();
  });

  /**
    We have an error? Must be down! (Maybe it should be critical?)
  */
  stream.addListener('error', function (e) {
    service.status = "down";
    service.statusCode = e.errno;
    service.message = e.message;
    callback(service.status, service);
  });
};
