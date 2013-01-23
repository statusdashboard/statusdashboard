var dgram = require('dgram'),
    Buffer = require('buffer').Buffer;

exports.check = function(serviceDefinition, service, callback) {

  /**
    Create a UDP socket
  */
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
    callback(service.status, service);
  });

  /**
    We have an error? Must be down! (Maybe it should be critical?)
  */
  sock.on("error", function (exception) {
    service.status = "down";
    service.statusCode = 0;
    service.message = exception;
    callback(service.status, service);
    sock.close();
  });

  /**
    Last, we send a command (shouldnt it check if we already are getting buffer data?)
  */
  var buf = new Buffer(serviceDefinition.cmd);
  sock.send(buf, 0, buf.length, serviceDefinition.port, serviceDefinition.host);
};
