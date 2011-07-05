// Needs to export a create method that takes a handle to the controller.
// up/down/unknown/critical are expected messages. Probably need to add transition status up -> down, down->up or up->critical

exports.create = function(api) {
  console.log('Creating the plugin: ' + __filename);
  // new route should be: /api/[pluginName]/whatever
  api.emit("routeContribution", { method: 'GET', path: /^\/api\/console\/test$/, binding: module.exports.myRouteContribution });

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

module.exports.myRouteContribution = function(req, res) {
  res.send(200, {}, "myRouteContribution");
};
