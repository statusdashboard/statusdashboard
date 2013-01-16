var https = require('https'),
    checkHttpValueResponse = require('../checks/httpValueResponse').execute;

exports.check = function(serviceDefinition, service, callback) {
  /**
    HTTPS options
  */
  var options = {
    host: serviceDefinition.host,
    port: serviceDefinition.port,
    path: serviceDefinition.path,
    headers: serviceDefinition.headers
  };

  /**
    HTTPS call and error handling
  */
  https.get(options, function(response) {
    var check = serviceDefinition.callback || checkHttpValueResponse;
    service.message = '';
    check(response, serviceDefinition, service, callback);
  })
  .on('error', function(e) {
    service.status = "down";
    service.statusCode = 0;
    service.message = e.message;
    callback(service.status, service);
  });
};
