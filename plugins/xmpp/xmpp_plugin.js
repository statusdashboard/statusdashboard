/**
 *  XMPP plugin : Post status to XMPP buddy
 *
 *  @author Christophe Hamerling - christophe.hamerling@gmail.com
 */
var _ = require('underscore')._
  , log;

exports.create = function(api, settings) {

  log = settings.logger ? settings.logger : require('util').log;

  if (settings.plugins && settings.plugins.xmpp && settings.plugins.xmpp.enable) {
    log('Creating the plugin: ' + __filename);

    var lastService = {};
    var lastCount = 0;
    var XMPP = require('node-xmpp-client');
    var ltx = require('ltx');

    var client = new XMPP.Client(settings.plugins.xmpp.from);

    var sendXMPP = function(message) {
      var stanza = new ltx.Element('message', {to: settings.plugins.xmpp.to, type: 'chat'}).c('body').t(message);
      client.send(stanza);
    }

    client.on('error', function() {
      log('Error on XMPP Client');
    });

    client.on('stanza', function(message) {
      log("Got a message " + message);
    });

    client.on('online', function() {
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

      api.on('maintenance', function(service) {
        checkChanges(service);
      });

      api.on('refresh', function(status) {
        var count = status.summarize.up + status.summarize.critical + status.summarize.down + status.summarize.unknown + status.summarize.maintenance;
        if (lastCount != count) {
          var msg = 'Up: ' + status.summarize.up + ', ' + 'Critical: ' + status.summarize.critical + ', Down: ' + status.summarize.down + ', Maintenance: ' +  status.summarize.maintenance + ', Unknown: ' + status.summarize.unknown;
          sendXMPP(msg);
          lastCount = count;
        }
      });
    });

    var checkChanges = function(service) {
      if (!lastService[service.name]) {
        lastService[service.name] = {};
        lastService[service.name].status = 'up';
      }
      if (lastService[service.name].status != service.status) {
        if (service.status == 'up') {
          sendXMPP("[" + service.status.toUpperCase() + "] " + service.name);
        } else {
          sendXMPP("[" + service.status.toUpperCase() + "] " + service.name + ", Code: " +  service.statusCode + ", Message: " + service.message);
        }
      }
      lastService[service.name].status = service.status;
    };

  } else {
    log('XMPP plugin is not enabled');
  }
};
