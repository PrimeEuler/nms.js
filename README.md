# nms.js 
========
Open source network management system for Node.js

The goal is for nms.js to be a truly distributed, scalable management application platform for all aspects of the [FCAPS](https://en.wikipedia.org/wiki/FCAPS) network management model, much like [OpenNMS](http://www.opennms.org).

The project relies heavely on a few core modules:



+ [keypress](https://github.com/TooTallNate/keypress) - Emits keypress events from any readble stream such as `prcoess.stdin`.
+ [lineman](https://github.com/PrimeEuler/nms.js/blob/master/lib/sheldon/lib/lineman.js) - Line manager listens for keypress events and navigates and emits a line buffer much like [readline](https://github.com/nodejs/node/blob/master/lib/readline.js).
+ [sheldon](https://github.com/PrimeEuler/nms.js/tree/master/lib/sheldon) - Sheldon listens for line and keypress events to provide a thin shell around javascript. It uses [minimist](https://github.com/substack/minimist) to parse emited lines into arguments. The first argument is assumed to be the path to a javascript object and is passed to the [lodash](https://github.com/lodash/lodash) `_.get(sheldon.context, path)` function. If the `typeOf` javascipt object is `function`,  the parameter names of the function are read and the rest of the minimist arguments are applied by name or in order to the function and it is called. If any parameter names are missing from the `minimist` arguments, `lineman` asks/prompts for those parameters by name.  All other objects are formatted with `util.inspect` and written to a writeable stream such as `process.stdout` via `lineman`. 
+ [nms.js](https://github.com/PrimeEuler/nms.js) - NMS.js simply adds network management tools to the `sheldon.context` object. For instance, the ssh client:
```javascript
sheldon.context.nms = {
    ssh: function(host,username,password){
            var client = new ssh.Client();
            var params = {
                host:host.split(':')[0],
                port:host.split(':')[1],
                username:username,
                password:password
            }
            client.connect(params);
            client.on('error', sheldon.cli.inspect);
            client.on('ready', openShell);
            client.on('end', client.destroy);
            function openShell(){
                client.shell(attach);
            }
            function attach(error,sshStream){
                sheldon.lineman.attach( { 
                    stdin:sshStream, 
                    stdout:sshStream 
                    
                }, error )
            }
            return('connecting to ' + host);
    }
}
```
`minimist` agruments applied by lineman prompt:
```bash
NMS-HOST#nms.ssh
host:nethack.alt.org
username:nethack
password:
connecting to nethack.alt.org
```
`minimist` arguments applied by order:
```bash
NMS-HOST#nms.ssh nethack.alt.org nethack guest
connecting to nethack.alt.org
```
`minimist` arguments applied by name:
```bash
NMS-HOST#nms.ssh --host nethack.alt.org --username nethack --password *****
connecting to nethack.alt.org
```
resulting in a ssh shell connection to nethack.alt.org
```bash
 ## nethack.alt.org - http://nethack.alt.org/
 ##
 ## Games on this server are recorded for in-progress viewing and playback!

  Not logged in.

  l) Login
  r) Register new user
  w) Watch games in progress

  s) server info
  m) MOTD/news (updated: 2015.12.07)

  q) Quit



  =>
```


Install
=======

```bash
$ npm install nms.js
```


Examples
===============

* [cliNMS.js](https://github.com/PrimeEuler/nms.js/blob/master/example/cliNMS.js) Command line interface into nms.js: 

```javascript
var nms = require('nms.js')
var NMS = new nms(process.stdin, process.stdout)
```
* [netNMS.js](https://github.com/PrimeEuler/nms.js/blob/master/example/netNMS.js) Telnet interface into nms.js: 

```javascript
 var net = require('net'),
    nms = require('../'),
    telnetStream    = require('../lib/telnet-client');

var serverSocket = net.createServer(function(connection) {
        //telnet IAC events
        var telnet = new telnetStream();  
        connection.pipe(telnet.rx)
        telnet.tx.pipe(connection)
        //
        var NMS = new nms(telnet.rx, telnet.tx)
        //terminal dimensions
        telnet.tx.writeDo(telnet.options.indexOf('windowSize'));
});

serverSocket.listen(9999,function(){
    console.log('listening on ', 9999)
});
```

* [netNMS.js](https://github.com/PrimeEuler/nms.js/blob/master/example/webNMS.js) Web ([term.js](https://github.com/chjj/term.js)) interface into nms.js:
```javascript
var shellServer     = require('../lib/shellServer'),
    nms             = require('../'),
    util            = require('util'),
    webNMS          = new shellServer();
    webNMS.on('connection', function (socket) {
        socket.on('TERMINAL', function(stream){
          //hack for socket.io-stream events client bind
          socket.on(stream.id, function(e){
              stream.emit(e.event,e.data)
          });
          stream.on('socket.io',function(e){
              socket.emit(stream.id,e)
          })
          //
          var NMS = new nms(stream);
        })
    })
```
