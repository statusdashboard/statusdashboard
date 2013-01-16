exports.execute = function(response, service, callback) {
  if (response.statusCode == 200) {
    service.status = "up";
  } else if (response.statusCode == 301 || response.statusCode == 302) {
    service.status = "unknown";
    service.message = "Redirected to " + response.headers.location;
  } else if (response.statusCode == 503 || response.statusCode == 404) {
    service.status = "down";
  } else {
    service.status = "critical";
  }

  service.statusCode = response.statusCode;

  callback(service.status, service);
};

