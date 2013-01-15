var checkHttpStatusCode = require('../checks/httpStatusCode').execute;

exports.execute = function(response, serviceDefinition, service, callback) {

  checkHttpStatusCode(response, service, callback);

  if(response.statusCode === 200){
    response.on('data', function(chunk){

      var summary = JSON.parse(chunk);

      if(summary.critical === 0 && summary.down === 0 && summary.unknown ===0) {
        service.status = 'up';
      } else {
        service.status = 'down';
        service.message = "Services up: "+ summary.up + ", Services down: "+ summary.down + ", Services critical: "+summary.critical + ", Services unknown: "+summary.unknown;
      }

      callback(service.status, service);
    });
  }
};

