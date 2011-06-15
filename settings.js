var os = require('os');
var logger = require('util');

exports.create = function() {
  var settings = {};

  var defaults = {
    hostname: '127.0.0.1',
    port: 8080,
    services: []
  };

  settings['olivier'] = {
    port: 8080,
    services: [{
      name: 'couchdb', 
      label: 'Couchdb server @ local',
      check: 'http',
      host: '127.0.0.1', 
      port: '5984',
      path: '/'
    }, {
      name: 'bazoud.free.fr', 
      label: 'Olivier Bazoud blog',
      check: 'http',
      host: 'bazoud.free.fr', 
      port: '80',
      path: '/'
    }, {
      name: 'redis', 
      label: 'Redis server @ local',
      check: 'tcp',
      host: '127.0.0.1', 
      port: '6379',
      cmd: 'PING\r\n'
    }, {
      name: 'FTP Local',
      label: 'Ftp @ local',
      check: 'ftp',
      host: 'localhost',
      port: '21',
      username: 'statusdashboard',
      password: 'statusdashboard'
    }, {
      name: 'PID file',
      label: 'Pid @ local',
      check: 'pidfile',
      pidfile: '/tmp/terminal.pid'
    }]
  };

  settings['nodester'] = {
    port: 10487,
    services: [{
      name: 'bazoud.free.fr', 
      label: 'Olivier Bazoud blog',
      check: 'http',
      host: 'bazoud.free.fr', 
      port: '80',
      path: '/'
    }, {
      name: 'bazoud.free.fr', 
      label: 'Olivier Bazoud blog fail',
      check: 'http',
      host: 'bazoud.free.fr', 
      port: '80',
      path: '/test.php'
    }]
  };

  if (process.env.APP_ENV) {
    var settings = merge(defaults, settings[process.env.APP_ENV]);
    return settings;
  }

  return defaults;
};

function merge(obj1, obj2) {
  for (var p in obj2) {
    try {
      if (obj2[p].constructor == Object) {
        obj1[p] = merge(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

