var http = require('http'),
    checkHttpValueResponse = require('../checks/httpValueResponse').execute;

exports.check = function(serviceDefinition, service, callback) {
  /**
    HTTP module options
  */
  var options = {
    host: serviceDefinition.host,
    port: serviceDefinition.port,
    path: serviceDefinition.path,
    headers: serviceDefinition.headers
  };

  /**
    HTTP call and error handling
  */
  http.get(options, function(response) {
    service.message = '';
    checkHttpValueResponse(response, serviceDefinition, service, callback);
  })
  .on('error', function(e) {
    service.status = "down";
    service.statusCode = 0;
    service.message = e.message;
    callback(service.status, service);
  });
};
