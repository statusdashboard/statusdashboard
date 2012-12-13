/**
 *  Webhook plugin : Post status remote HTTP service
 *  @author Christophe Hamerling - christophe.hamerling@ow2.org
 */
var logger = require('util');

exports.create = function(api, settings) {
  if (settings.plugins && settings.plugins.webhook && settings.plugins.webhook.enable) {
    var request = require('request');

    console.log('Creating the plugin: ' + __filename);

    // add route for test purposes
    api.emit("postRouteContribution", { method: 'POST', path: '/api/webhook/test', binding: module.exports.myRouteContribution });

    var lastCount = 0;
    var lastService = {};

    var post = function(body) {
      request.post({
        url: settings.plugins.webhook.url,
        method: 'post',
        body: body,
        json: true
      },
      function(error, response, body) {
        if (error) {
          logger.log('Failed to send http message : ' + error);
        }
      });
    };

    api.on('up', function(service) {
      checkChanges(service);
    });

    api.on('down', function(service) {
      checkChanges(service);
    });

    api.on('unknown', function(service) {
      checkChanges(service);
    });

    api.on('critical', function(service) {
      checkChanges(service);
    });

    checkChanges = function(service) {
      if (!lastService[service.name]) {
        lastService[service.name] = {};
        lastService[service.name].status = 'up';
      }
      if (lastService[service.name].status != service.status) {
        if (service.status == 'up') {
          post({ service : service.name, status : service.status.toUpperCase()});
        } else {
          post({ service : service.name, status : service.status.toUpperCase(), code : service.statusCode, message : service.message});
        }
      }
      lastService[service.name].status = service.status;
    };

    api.on('refresh', function(status) {
      var count = (status.summarize.critical + status.summarize.down + status.summarize.unknown).toString();
      if (lastCount != count) {
        post({ summary : { up : status.summarize.up, critical : status.summarize.critical, down : status.summarize.down, unknown : status.summarize.unknown}});
        lastCount = count;
      }
    });
  }
};

module.exports.myRouteContribution = function(req, res) {
  console.log('Got a webhook call : ', req.body);
  res.send(200);
};

