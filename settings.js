var os = require('os');
var fs = require('fs');
var path = require("path");
var logger = require('util');

// Hack nodejs API change
fs.exists = fs.exists || require('path').exists;
fs.existsSync = fs.existsSync || require('path').existsSync;

exports.create = function() {
  var settings = {};

  var defaults = {
    title: 'Services Status Dashboard',
    hostname: '127.0.0.1',
    port: 8080,
    client: {
      transports: []
    },
    services: [],
    serviceInterval: 20000,
    serviceDelay: 1000
  };

  settings['demo'] = {
    port: 8080,
    hostname: '0.0.0.0',
    services: [{
      name: 'couchdb', 
      label: 'Couchdb server @ local',
      check: 'http',
      host: '127.0.0.1', 
      port: '5984',
      path: '/'
    }, {
      name: 'blog.bazoud.com', 
      label: 'Olivier Bazoud blog: Index',
      check: 'http',
      host: 'blog.bazoud.com', 
      port: '80',
      path: '/'
    }, {
      name: 'blog.bazoud.com-healthCheck',
      label: 'Olivier Bazoud blog: healthCheck',
      check: 'http',
      host: 'blog.bazoud.com',
      port: '80',
      path: '/healthCheck'
    }, {
      name: 'blog.bazoud.com-fixedvalue-ok',
      label: 'Olivier Bazoud blog: FixedValue ok',
      check: 'http',
      host: 'blog.bazoud.com',
      port: '80',
      path: '/healthCheck',
      checkFixedValueResponse: {
        'ok': 'up',
        'ko': 'critical'
      }
    }, {
      name: 'healthCheck-fixedvalue-ko',
      label: 'Olivier Bazoud blog: FixedValue: ko',
      check: 'http',
      host: 'blog.bazoud.com',
      port: '80',
      path: '/healthCheckKO',
      checkFixedValueResponse: {
        'ok': 'up',
        'ko': 'critical'
      }
    }, {
      name: 'blog.bazoud.com-rangevalues-10',
      label: 'Olivier Bazoud blog: RangeValues 10',
      check: 'http',
      host: 'blog.bazoud.com',
      port: '80',
      path: '/healthCheckRange',
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
      name: 'redis-without-cmd',
      label: 'Redis server @ local (without cmd)',
      check: 'tcp',
      host: '127.0.0.1',
      port: '6379'
    }, {
      name: 'FTP-Local',
      label: 'Ftp @ local',
      check: 'ftp',
      host: 'localhost',
      port: '21',
      username: 'statusdashboard',
      password: 'statusdashboard'
    }, {
      name: 'PID-file',
      label: 'Pid @ local',
      check: 'pidfile',
      pidfile: '/tmp/terminal.pid',
      status: 'maintenance'
    }],
    serviceInterval: 6000,
    plugins : {
      console : {
        enable: false
      },
      irc : {
        enable: false,
        server: 'irc.freenode.net',
        nick: 'status',
        options: {
          debug: false,
          port: 8001,
          channels: ['#statusdashboard']
        }
      },
      xmpp: {
        enable: false,
        from: {
          jid: 'from@jabber.org',
          password: 'XXX',
          host : 'jabber.org'
        },
        to: 'to@jabber.org'
      },
      twitter: {
        enable: false,
        consumer_key: "",
        consumer_secret: "",
        access_token_key: "",
        access_token_secret: ""
      },
      history: {
        enable: true,
        host: "127.0.0.1",
        port: 6379,
        namespace: "statusdashboard",
        options: {
        },
        client: true
      },
      mail: {
        enable: false,
        sender: 'xxx',
        to: 'xxx',
        subject: '[statusdashboard]: Alert',
        options: {
          nodemailer: {
            host: 'smtp.gmail.com',
            port: 465,
            use_authentication: true,
            ssl: true,
            user: 'xxx',
            pass: 'xxx',
            debug: false
          }
        }
      },
      webhook: {
        enable : false,
        url: 'http://localhost:8080/api/webhook/test'
      },
      heartbeat: {
        enable: false,
        period: 20000
      },
      graphite: {
        enable: false,
        url: 'plaintext://xxx:2003/',
        prefix: 'xxx'
      }
    }
  };

  var mySettings = defaults;
  // logger.log("Dumping defaults:\r\n" + JSON.stringify(mySettings));

  if (process.env.APP_ENV) {
    logger.log("Loading settings: " + process.env.APP_ENV);
    mySettings = merge(mySettings, settings[process.env.APP_ENV]);
  }

  // logger.log("Dumping after APP_ENV:\r\n" + JSON.stringify(mySettings));

  if (process.env.APP_SETTINGS) {
    logger.log("Loading appSettings: " + process.env.APP_SETTINGS);
    if (fs.existsSync(process.env.APP_SETTINGS)) {
      appSettings = require(process.env.APP_SETTINGS).create();
      mySettings = merge(mySettings, appSettings);
    } else {
      logger.log("WARN: " + process.env.APP_SETTINGS + " does not exist or not a file.");
    }
  }

  // logger.log("Dumping after APP_SETTINGS:\r\n" + JSON.stringify(mySettings));
  return mySettings;
};

function merge(obj1, obj2) {
  for (var p in obj2) {
    try {
      if (typeof(obj2[p]) == 'object') {
        if (obj2[p].constructor == Array) {
          if (obj2[p].length != 0) {
            for (var j in obj2[p]) {
              if (obj1[p].length == 0) {
                obj1[p][0] = obj2[p][j];
              } else {
                var found = false;
                for (var i in obj1[p]) {
                  if (obj1[p][i].name == obj2[p][j].name) {
                    obj1[p][i] = merge(obj1[p][i], obj2[p][j]);
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  obj1[p][obj1[p].length] = obj2[p][j];
                }
              }
            }
          }
        } else {
          obj1[p] = merge(obj1[p], obj2[p]);
        }
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      // logger.log(e);
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

