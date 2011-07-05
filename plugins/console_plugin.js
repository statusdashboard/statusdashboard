// Needs to export a create method that takes a handle to the controller.
// up/down/unknown/critical are expected messages. Probably need to add transition status up -> down, down->up or up->critical

exports.create = function(api) {
  console.log('Creating the plugin: ' + __filename);
  api.on('up', function(service){
    console.log('success...' + service.name);
  });  

  api.on('down', function(service){
    console.log('failed...' + service.name);
  });  

  api.on('unknown', function(service){
    console.log('unknown...' + service.name);
  });  

  api.on('critical', function(service){
    console.log('critical...' + service.name);
  });  
};
