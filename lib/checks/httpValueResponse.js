var checkRange = require('./range').execute;

exports.execute = function(response, serviceDefinition, service, callback) {
  if (response.statusCode == 200 && (serviceDefinition.checkFixedValueResponse || serviceDefinition.checkRangeValuesResponse)) {
    response.on('data', function (chunk) {

      var value = ('' + chunk).substring(0, chunk.length - 1);

      if (serviceDefinition.checkFixedValueResponse) {
        if (serviceDefinition.checkFixedValueResponse[value]) {
          service.status = serviceDefinition.checkFixedValueResponse[value];
        } else {
          service.status = "critical";
          service.message = "Unexpected value " + value;
        }
      } else {
        if (serviceDefinition.checkRangeValuesResponse) {
          if (serviceDefinition.checkRangeValuesResponse.length === 0) {
            service.status = "critical";
            service.message = "No range defined!";
          } else {

            var found = false;

            for(var i = 0; i < serviceDefinition.checkRangeValuesResponse.length; i++) {

              var range = serviceDefinition.checkRangeValuesResponse[i];

              if (checkRange(range.min, range.max, parseInt(value, 10))) {
                service.status = range.status;
                found = true;
                break;
              }
            }
            if (!found) {
              service.status = "critical";
              service.message = "No range matches";
            }
          }
        }
      }

      callback(service.status, service);
    });
  } else {
    /**
     TODO: What if not 200?
    */
    callback(service.status, service);
  }
};

