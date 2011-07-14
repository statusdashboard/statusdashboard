var logger = require('util');
var sys = require('sys');
var twitter = require('twitter');

exports.create = function(api, settings) {
  if (settings.plugins && settings.plugins.twitter && settings.plugins.twitter.enable) {
    console.log('Creating the plugin: ' + __filename);

    var twit = new twitter({
      consumer_key: settings.plugins.twitter.consumer_key,
      consumer_secret: settings.plugins.twitter.consumer_secret,
      access_token_key: settings.plugins.twitter.access_token_key,
      access_token_secret: settings.plugins.twitter.access_token_secret
    });

    twit.tweet = function(message, options) {
      twit.verifyCredentials(function (data) {
        // logger.log("verifyCredentials: " + sys.puts(sys.inspect(data)));
      }).updateStatus(message, function (data) {
        logger.log("Send a tweet: " + message);
        // logger.log("updateStatus: " + sys.puts(sys.inspect(data)));
      });
    };

    var lastCount = 0;
    var lastService = {};

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
          twit.tweet("[" + service.status.toUpperCase() + "] " + service.name + " #statusdashboard");
        } else {
          twit.tweet("[" + service.status.toUpperCase() + "] " + service.name + ", Code: " +  service.statusCode + ", Message: " + service.message + "  #statusdashboard");
        }
      }
      lastService[service.name].status = service.status;
    };

    api.on('refresh', function(status) {
      var count = (status.summarize.critical + status.summarize.down + status.summarize.unknown).toString();
      if (lastCount != count) {
        var msg = 'Up: ' + status.summarize.up + ', ' + 'Critical: ' + status.summarize.critical + ', Down: ' + status.summarize.down + ', Unknown: ' + status.summarize.unknown;
        twit.tweet(msg + "  #statusdashboard");
        lastCount = count;
      }
    });

  }
};


