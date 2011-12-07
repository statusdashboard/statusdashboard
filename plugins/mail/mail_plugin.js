var logger = require('util');

exports.create = function(api, settings) {
  if (settings.plugins && settings.plugins.mail && settings.plugins.mail.enable) {
    var nodemailer = require('nodemailer');

    console.log('Creating the plugin: ' + __filename);

    nodemailer.SMTP = settings.plugins.mail.options.nodemailer;
    
    var lastCount = 0;
    var lastService = {};

    var mail = function(body) {
      nodemailer.send_mail({
          sender: settings.plugins.mail.sender,
          to: settings.plugins.mail.to,
          subject: settings.plugins.mail.subject,
          //html: body,
          body: body,
          debug: settings.plugins.mail.options.nodemailer.debug
        },
        function(error, success){
          logger.log('Message ' + (success ? 'sent' : 'failed') + ":" + body);
        }
      );
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
          mail("[" + service.status.toUpperCase() + "] " + service.name);
        } else {
          mail("[" + service.status.toUpperCase() + "] " + service.name + ", Code: " +  service.statusCode + ", Message: " + service.message);
        }
      }
      lastService[service.name].status = service.status;
    };

    api.on('refresh', function(status) {
      var count = (status.summarize.critical + status.summarize.down + status.summarize.unknown).toString();
      if (lastCount != count) {
        var msg = 'Up: ' + status.summarize.up + ', ' + 'Critical: ' + status.summarize.critical + ', Down: ' + status.summarize.down + ', Unknown: ' + status.summarize.unknown;
        mail(msg);
        lastCount = count;
      }
    });
  }
};

