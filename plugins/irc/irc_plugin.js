
exports.create = function(api, settings) {
  if (settings.plugins && settings.plugins.irc && settings.plugins.irc.enable) {
    console.log('Creating the plugin: ' + __filename);
    var irc = require('irc');
    var channels = settings.plugins.irc.options.channels;
    var bot = new irc.Client(settings.plugins.irc.server, settings.plugins.irc.nick, settings.plugins.irc.options);
    var lastCount = 0;
    var lastService = {};

    bot.on('connect', function() {
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
            bot.say(channels, "[" + service.status.toUpperCase() + "] " + service.name);
          } else {
            bot.say(channels, "[" + service.status.toUpperCase() + "] " + service.name + ", Code: " +  service.statusCode + ", Message: " + service.message);
          }
        }
        lastService[service.name].status = service.status;
      };

      api.on('refresh', function(status) {
        var count = (status.summarize.critical + status.summarize.down + status.summarize.unknown).toString();
        if (lastCount != count) {
          var msg = 'Up: ' + status.summarize.up + ', ' + 'Critical: ' + status.summarize.critical + ', Down: ' + status.summarize.down + ', Unknown: ' + status.summarize.unknown;
          bot.say(channels, msg);
          lastCount = count;
        }
      });
    });

    bot.on('error', function(message) {
      console.error('ERROR: %s: %s', message.command, message.args.join(' '));
    });
  }
};


