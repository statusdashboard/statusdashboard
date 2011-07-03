// Needs to export a create method that takes a handle to the controller.
// up/down/unknown/critical are expected messages. Probably need to add transition status up -> down, down->up or up->critical
// Needs redis to be running.
// needs noderedis. install it via npm install hiredis redis
var redis = require("redis")

exports.create = function(api, options){
  console.log('Creating the Redis storage plugin');
  var client = redis.createClient(options.port, options.host);
  client.on('error', function(err){
     console.log("Error " + err);
  });
  
  var storeStatus = function (service){
    client.rpush("statusdashboard:"+service.name, JSON.stringify({time: new Date().valueOf(), status: service.status, message: service.message, code:service.statusCode}));
  }
      
  api.on('up', function(service){
    storeStatus(service);
    console.log('success...'+ service.name);
  });  

  api.on('down', function(service){
    storeStatus(service);
    console.log('down...'+ service.name);
  });  

  api.on('unknown', function(service){
    storeStatus(service);
    console.log('unknown...'+ service.name);
  });  

  api.on('critical', function(service){
    storeStatus(service);
    console.log('critical...'+ service.name);
  });  
  
  return {
    history: function(service, callback){
      console.log("getting history");
      client.lrange('statusdashboard:'+service.name, 0, 100,callback);
    }
  };
};
