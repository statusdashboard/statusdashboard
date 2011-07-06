var irc = require('irc');

exports.create = function(api, settings) {
  if (settings.plugins && settings.plugins.irc && settings.plugins.irc.enable) {
    console.log('Creating the plugin: ' + __filename);
    var bot = new irc.Client(settings.plugins.irc.server, settings.plugins.irc.nick, settings.plugins.irc.options);

    bot.on('connect', function() {
      api.on('up', function(service){
        bot.say(settings.plugins.irc.options.channels, service.name + ": up");
      });  

      api.on('down', function(service){
        bot.say(settings.plugins.irc.options.channels, service.name + ": down.");
      });  

      api.on('unknown', function(service){
        bot.say(settings.plugins.irc.options.channels, service.name + ": unknown");
      });  

      api.on('critical', function(service){
        bot.say(settings.plugins.irc.options.channels, service.name + ": critical");
      });
    });

    bot.on('error', function(message) {
      console.error('ERROR: %s: %s', message.command, message.args.join(' '));
    });
  }
};


