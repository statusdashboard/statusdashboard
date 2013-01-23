var checkHttpStatusCode = require('../checks/httpStatusCode').execute;

exports.execute = function(response, serviceDefinition, service, callback) {

  /**
    I find it more logical to do a callback chain here. Else,
    it would create a possible double-callback function
    (since you could get the right data but still receive the wrong statusCode)
  */
  checkHttpStatusCode(response, service, function (serviceStatus, service) {

    if (serviceStatus !== 'up') {
      callback(service.status, service);
    }

    /**
      Note: Here, we should really allow to create your own onData callback function,
      so that you can parse other stuff than just JSON
    */
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
  });

};

