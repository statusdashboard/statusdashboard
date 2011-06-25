Status Dashboard
=======

Status Dashboard is status page for your configured services or applications.

See the [Nodester](http://nodester.com) demo: [http://statusdashboard.nodester.com](http://statusdashboard.nodester.com)

Screenshots
=======

<img src="http://bazoud.free.fr/wp-content/uploads/ssd1.png" alt="">

<img src="http://bazoud.free.fr/wp-content/uploads/ssd2.png" alt="">

<img src="http://bazoud.free.fr/wp-content/uploads/ssd3.png" alt="">

Dependencies
=======

* See package.json
* run the following command to install the dependencies
<pre class="terminal">
$ npm install
</pre>

* node.js 0.4.8
* npm 1.0.6
* socket.io 0.6.18
* node-static 0.5.6
* journey 0.4.0-pre-2
* underscore 1.1.6

Roadmap
=======
* Improve UI: scrollbars, filters, check type column, ...
* Add network services like SMTP, POP3, ...
* Improve REST API to get / push data
...

How To Use
=======

* git clone git@github.com:obazoud/statusdashboard.git
or fork it
* node server.js

See settings.js to have your own settings. For example, in my local computer:

* export APP_ENV=olivier
* node server.js

Daemon init script for node.js: [https://gist.github.com/715255](https://gist.github.com/715255)

REST API
=======

* List services
<pre class="terminal">
$ curl http://127.0.0.1:8080/api/services
{"last":"Fri, 17 Jun 2011 22:33:03 GMT","services":[{"name":"couchdb","label":"Couchdb server @ local","status":"up","statusCode":200,"message":""},{"name":"bazoud.free.fr","label":"Olivier Bazoud blog","status":"up","statusCode":200,"message":""},{"name":"bazoud.free.fr","label":"Olivier Bazoud blog test.php","status":"up","statusCode":200,"message":""},{"name":"redis","label":"Redis server @ local","status":"up","statusCode":0,"message":""},{"name":"FTP Local","label":"Ftp @ local","status":"down","statusCode":0,"message":"ECONNREFUSED, Connection refused"},{"name":"PID file","label":"Pid @ local","status":"unknown","statusCode":9,"message":"EBADF, Bad file descriptor '/tmp/terminal.pid'"}],"lastupdate":"Fri, 17 Jun 2011 22:33:08 GMT","summarize":{"lastupdate":"Fri, 17 Jun 2011 22:33:08 GMT","up":3,"critical":0,"down":1,"unknown":2}}
</pre>

* Retrieve a specific service
<pre class="terminal">
$ curl http://127.0.0.1:8080/api/services/couchdb
{"name":"couchdb","label":"Couchdb server @ local","status":"up","statusCode":200,"message":""}
</pre>

* Retrieve a summary
<pre class="terminal">
$ curl http://127.0.0.1:8080/api/summarize
{"up":4,"critical":0,"down":1,"unknown":1}
</pre>


Early adopters
=======

* See http://status.exoplatform.org

<img src="http://bazoud.free.fr/wp-content/uploads/ssd4.png" alt="status.exoplatform.org">

