Status Dashboard
=======

Status Dashboard is status page for your configured services or applications.

See the [demo](http://statusdashboard.nodester.com)

Screenshots
=======

<img src="http://bazoud.free.fr/wp-content/uploads/ssd1.png" alt="">

<img src="http://bazoud.free.fr/wp-content/uploads/ssd2.png" alt="">

<img src="http://bazoud.free.fr/wp-content/uploads/ssd3.png" alt="">

Dependencies
=======

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

REST API

* curl http://127.0.0.1:8080/api/summarize
{"up":4,"critical":0,"down":1,"unknown":1}

Early adopters
=======

* See http://status.exoplatform.org

<img src="http://bazoud.free.fr/wp-content/uploads/ssd4.png" alt="status.exoplatform.org">

