var os = require('os');
var logger = require('util');

exports.create = function() {
  var settings = {};

  var defaults = {
    title: 'Services Status Dashboard',
    hostname: '127.0.0.1',
    port: 8080,
    services: [],
    serviceInterval: 20000,
    serviceDelay: 500
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
      label: 'Olivier Bazoud blog: Index',
      check: 'http',
      host: 'bazoud.free.fr', 
      port: '80',
      path: '/'
    }, {
      name: 'bazoud.free.fr (Normal)',
      label: 'Olivier Bazoud blog: Normal',
      check: 'http',
      host: 'bazoud.free.fr',
      port: '80',
      path: '/test.php'
    }, {
      name: 'bazoud.free.fr (FixedValue: ok)',
      label: 'Olivier Bazoud blog: FixedValue ok',
      check: 'http',
      host: 'bazoud.free.fr',
      port: '80',
      path: '/test_ok.php',
      checkFixedValueResponse: {
        'ok': 'up',
        'ko': 'critical'
      }
    }, {
      name: 'bazoud.free.fr php (FixedValue: ko)',
      label: 'Olivier Bazoud blog: FixedValue: ko',
      check: 'http',
      host: 'bazoud.free.fr',
      port: '80',
      path: '/test_ko.php',
      checkFixedValueResponse: {
        'ok': 'up',
        'ko': 'critical'
      }
    }, {
      name: 'bazoud.free.fr php (RangeValues: 10)',
      label: 'Olivier Bazoud blog: RangeValues 10',
      check: 'http',
      host: 'bazoud.free.fr',
      port: '80',
      path: '/test10.php',
      checkRangeValuesResponse: [
        { 'status': 'up', 'min': 0, 'max': 10 },
        { 'status': 'critical', 'min': 10 }
      ]
    }, {
      name: 'redis', 
      label: 'Redis server @ local',
      check: 'tcp',
      host: '127.0.0.1', 
      port: '6379',
      cmd: 'PING\r\n',
      rcv: '+PONG\r\n'
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
    }],
    serviceInterval: 5000,
    plugins : {
      irc : {
        enable: false,
        server: 'irc.freenode.net',
        nick: 'ircPlugin',
        options: {
          debug: false,
          port: 8001,
          channels: ['#statusdashboard']
        }
      }
    }
  };

  settings['nodester'] = {
    port: 10487,
    services: [{
      name: 'bazoud.free.fr', 
      label: 'Olivier Bazoud blog',
      check: 'http',
      host: 'bazoud.free.fr', 
      port: '80',
      path: '/',
      headers: {
        'Host': 'bazoud.free.fr'
      }
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

