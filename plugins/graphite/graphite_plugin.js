exports.create = function(api, settings) {
  log = settings.logger ? settings.logger : require('util').log;
  if (settings.plugins && settings.plugins.graphite && settings.plugins.graphite.enable) {
    log('Creating the plugin: ' + __filename);

    var graphite = require("graphite")
    var client = graphite.createClient(settings.plugins.graphite.url)

    api.on('up', function(service){
      var metricName = settings.plugins.graphite.prefix + "." + service.name.replace(/\./g, '_') + ".up";
      var metrics = {};
      metrics[metricName] = 1
      client.write(metrics);
    });

    api.on('down', function(service){
      var metricName = settings.plugins.graphite.prefix + "." + service.name.replace(/\./g, '_') + ".down";
      var metrics = {};
      metrics[metricName] = 1
      client.write(metrics);
    });

    api.on('unknown', function(service){
      var metricName = settings.plugins.graphite.prefix + "." + service.name.replace(/\./g, '_') + ".unknown";
      var metrics = {};
      metrics[metricName] = 1
      client.write(metrics);
    });

    api.on('critical', function(service){
      var metricName = settings.plugins.graphite.prefix + "." + service.name.replace(/\./g, '_') + ".critical";
      var metrics = {};
      metrics[metricName] = 1
      client.write(metrics);
    });
  }
};
