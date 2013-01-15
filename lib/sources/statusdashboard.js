var checkStatusDashboard = require('../checks/statusDashboard').execute;

exports.check = function(serviceDefinition, service, callback) {
  var options = {
    host: serviceDefinition.host,
    port: serviceDefinition.port,
    path: '/api/summarize'
  };

  http.get(options, function(response) {
    service.message = '';
    checkStatusDashboardResponse(response, serviceDefinition, service, callback);
  })
  .on('error', function(e) {
    service.status = "down";
    service.statusCode = 0;
    service.message = e.message;
    callback(service.status, service);
  });
};
