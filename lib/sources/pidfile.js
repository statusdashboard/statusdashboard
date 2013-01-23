var fs = require('fs');

exports.check = function(serviceDefinition, service, callback) {

  var pidfiles = [serviceDefinition.pidfile];
  var pid;

  service.status = "unknown";
  service.statusCode = 0;
  service.message = '';

  if (serviceDefinition.pidfile.constructor === Array) {
    pidfiles = serviceDefinition.pidfile;
  }

  for (var index = 0; index < pidfiles.length; index++) {

    /**
      We try to read the PID file. On failure, return unknown
    */
    try {
      pid = fs.readFileSync(pidfiles[index]);
    } catch (e) {
      service.status = "unknown";
      service.statusCode = e.errno;
      service.message = e.message;
      callback(service.status, service);
      return;
    }

    /**
      We try to send a kill signal to the PID file.

      Critial on an invalid PID value, down if we cannot kill the process (send a signal to it)
    */
    try {

      var pidInt = parseInt(pid, 10);

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
      callback(service.status, service);
      return;
    }
  }

  service.status = "up";
  callback(service.status, service);
};
