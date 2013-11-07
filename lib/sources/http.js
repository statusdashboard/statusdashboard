var http = require('http'),
    checkHttpValueResponse = require('../checks/httpValueResponse').execute,
    _ = require('underscore');

exports.check = function(serviceDefinition, service, callback) {
  /**
    HTTP options
  */
  var httpOptions = {
    host: serviceDefinition.host,
    port: serviceDefinition.port,
    path: serviceDefinition.path,
    headers: serviceDefinition.headers
  };

  var options = {};
  _.extend(options, httpOptions, serviceDefinition.options);

  /**
    HTTP call and error handling
  */
  http.get(options, function(response) {
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
