//
// Periodically call the healtcheck HTTP URL.
// This can be used on some Cloud providers to keep the app alive...
//
// For example, to keep the app alive on Heroku:
//
//  1. Deploy your app
//  2. Get the Heroku URL of your app
//  3. Set the environment variable 'heroku config:add HEARTBEAT_URL=http://yourapp.herokuapp.com'
//  4. Restart the app 'heroku restart'
//
// @chamerling
//

var http = require('http')
  , logger = require('util');

exports.create = function(api, settings) {
  if (settings.plugins && settings.plugins.heartbeat && settings.plugins.heartbeat.enable) {
    logger.log('Creating the plugin: ' + __filename);
    
    var url = process.env.HEARTBEAT_URL || 'http://' + (settings.hostname + ':' + (settings.port || '80')) + '/healthCheck'; 
    
    setInterval(function() {
      logger.log('[HEARTBEAT] ' + url);
      
      http.get(url, function(response) {
        logger.log('Got response from heartbeat');
      }).on('error', function(e) {
        logger.log('[HEARTBEAT] Error:' + e);
      })
    }, settings.plugins.heartbeat.period || 60000);
  }
};