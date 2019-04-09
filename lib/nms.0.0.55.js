var util            = require('util'),
    express         = require('express'),
    io              = require('socket.io'),
    ss              = require('socket.io-stream'),
    crypto          = require('crypto'),
    os              = require('os'),
    ssh             = require('ssh2'),
    fs              = require('fs'),
    net             = require('net');
var sheldon         = require('../lib/sheldon/lib/sheldon.0.0.57.js');
var telnetClient    = require('../lib/telnet-client');
var radius          = require('../lib/radius')
var _               = require('lodash');
var requirejs       = require("requirejs");
    requirejs.config({
        baseUrl: __dirname + '/ace/',
        nodeRequire: require
    })
    var ace         = requirejs('document');



var Throttle        = require('stream-throttle').Throttle;
var iconv           = require('iconv-lite');
var request         = require('request');
var bresenham       = require('bresenham');
var glmatrix        = require('gl-matrix');
var Canvas          = require('drawille');
var dashboard       = require('./blessed/dashboard.js');
const uuidV4        = require('uuid/v4');


var kafka           = require('kafka-node'),
    Producer        = kafka.Producer,
    Consumer        = kafka.Consumer
    KeyedMessage    = kafka.KeyedMessage;
var Client          = new kafka.Client();
    Client.on('error', function(err){
        console.log(err)
    })
var producer        = new Producer( Client );

producer.on('ready', function () {
    console.log('producer.ready')
    process.stdin.pipe(new nms()).pipe(process.stdout)

});
producer.on('error', function (err) {
    console.log('producer.error',err)
})


//globals
var gyro = {
    cube:function(output){
        var self = this;
        var mat4 = glmatrix.mat4;
        var vec3 = glmatrix.vec3;
        vec3.transformMat4 = function(out, a, m) {
            var x = a[0], y = a[1], z = a[2], w = m[3] * x + m[7] * y + m[11] * z + m[15];
            w = w || 1.0;
            out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
            out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
            out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
            return out;
        };
        
        var c = new Canvas(160, 120);
        //view-source:http://math.hws.edu/graphicsbook/source/webgl/cube-with-simple-rotator.html
        var points = [[-1,-1,-1],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]];
        var quads = [[0,1,2,3],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[4,7,6,5]];
        var cube = quads.map( function(quad) {
            return quad.map( function(v) {
                return vec3.fromValues.apply(null, points[v]); });
        });
        
        var projection = mat4.create();
        mat4.perspective(projection, Math.PI/3, 1, 1, 50);
        
        function draw(radZ,radX,radY) {
            console.log(radZ,radX,radY)
          var now = Date.now();
          var modelView = mat4.create();
          mat4.lookAt(modelView,
                      vec3.fromValues(0, 0.1, 4),
                      vec3.fromValues(0, 0, 0),
                      vec3.fromValues(0, 1, 0));
          /*           
          mat4.rotateY(modelView, modelView, Math.PI*2*now/10000);
          mat4.rotateZ(modelView, modelView, Math.PI*2*now/11000);
          mat4.rotateX(modelView, modelView, Math.PI*2*now/9000);
          */
          mat4.rotateY(modelView, modelView, radY);
          mat4.rotateZ(modelView, modelView, radZ);
          mat4.rotateX(modelView, modelView, radX);
          
          //mat4.scale(modelView, modelView, vec3.fromValues(Math.sin(now/1000*Math.PI)/2+1, 1, 1));
          c.clear();
          var transformed = cube.map(function(quad) {
            return quad.map(function(v) {
              var m = mat4.create();
              var out = vec3.create();
              mat4.mul(m, projection, modelView);
              vec3.transformMat4(out, v, m);
              return {
                x: Math.floor(out[0]*40+80),
                y: Math.floor(out[1]*40+80)
              };
            });
          });
          transformed.forEach(function(quad) {
            quad.forEach(function(v, i) {
              var n = quad[(+i+1)%4];
              bresenham(v.x, v.y, n.x, n.y, c.set.bind(c));
            });
          });
          output.write(c.frame());
        }
        
        self.draw = draw
        return self
        
        
    }
}
var sheldons = [];
var sockets = [];
var streams = [];
function parameterLog(){
        var l = {
            hitCount:0,
            hitTimeStamp:Date.now()
        }
        return l
    }
function parameterParser($parse){
        var p = {
            counter:{ hits:0 , timeStamp:Date.now() }
        }
        p.parse = function(data){
            p.counter.hits++;
            p.counter.timeStamp = Date.now();
            data = $parse?$parse(data):data
            return data;
        }
        return p
        
    }
var TYPES = {
        INTEGER: new parameterParser( function(data){
                return parseInt(data)
            }),
        'OCTET STRING': new parameterParser( function (data){
                return data 
            }),
        path: new parameterParser( function (data){
                return data //_.get(shell.context,data)
            }),
        port: new parameterParser( function(data){
                return parseInt(data)
            }),
        rows: new parameterParser( function(data){
                return parseInt(data)
            }),
        columns: new parameterParser( function(data){
                return parseInt(data)
            }),
        endpoint: new parameterParser( function(data){
                return data.toString()
            }),
        watcher: new parameterParser( function(data){
                return function(){
                    console.log(arguments)
                }
            }),
        callback: new parameterParser( function(data){
                return function(){
                    console.log(arguments)
                }
            })
        
    }
var PARAMETERS = {
        endpoint:{
            'localhost': new parameterLog(),
            'localhost:8822': new parameterLog(),
            'nethack.alt.org': new parameterLog(),
            'towel.blinkenlights.nl': new parameterLog(),
        },
        rows:{
            24:new parameterLog(),
        },
        columns:{
            80:new parameterLog(),
        },
        path:{
            'Date.now':new parameterLog(),
        },
        port:{
            8822:new parameterLog(),
            8444:new parameterLog()
        },
    }
    
var ARGS = {
    servers:{
        ssh:{
            port:TYPES.INTEGER
        },
        sio:{
            port:TYPES.INTEGER
        },
        radius:{
            port:TYPES.INTEGER
        }
    },
    clients:{
        ssh:{
            endpoint:TYPES['OCTET STRING'],
            username:TYPES['OCTET STRING'],
            password:TYPES['OCTET STRING']
        },
        telnet:{
            endpoint:TYPES['OCTET STRING']
        }
    }
    
    
}

var dataLogger = {
}
dataLogger.createLog = function(stream,uuid,cb){
    producer.createTopics([ uuid, uuid + '--TS'], false, function (err, data) {
        console.log('producer.createTopics',uuid, err, data);
        stream.on('data',function(data){
            
            function _cb_(err, data) {
                //console.log(err, data);
            }
            var ts = process.hrtime();
                ts = (ts[0] * 1000) + (ts[1] / 1000000);
            var payload =  [
                { topic: uuid , messages: data, partition: 0 },
                { topic: uuid + '--TS' , messages: ts, partition: 0 },
                ]
            producer.send(payload,_cb_)
            
        })
        cb()
    });
}

dataLogger.playback = function(uuid,STDOUT){
    var t = 0
    var epoc  = 0;
    function chunk(){
        var log = dataLogger[uuid]
        var timestamps = Object.keys(log).map( function(ts){
            return parseFloat(ts)
        }).sort();
        epoc = timestamps[t]
        //consumer = STDOUT
        //chunk = log[epoc.toString()]
        STDOUT.write( log[epoc.toString()] )
        t++;
        if(t === timestamps.length){
            return
        }else{
            //idle period = timestamps[t]-epoc   
            setTimeout( chunk,timestamps[t]-epoc );
        }
    }
    chunk();
}

function nms(){
    var shell = new sheldon()
    shell.TYPES = TYPES
    shell.PARAMETERS = PARAMETERS
    shell.context.crypto    = {
            files: {
                privateKey: fs.readFileSync('./crypto/host.key'),
                key:        fs.readFileSync('./crypto/host.key'),
                cert:       fs.readFileSync('./crypto/host.crt'),
                passphrase: 'password'
            }
    }   
    sheldons.push(shell)
    shell.on('finish',function(){
        var index = sheldons.indexOf(shell);
              console.log(      sheldons.splice(index,1))
    })
    var servers = {
        ssh:function(port){
                function noop(v) {}
                var server = new  require('ssh2').Server(shell.context.crypto.files);
                server.on('connection', connection)
                server.on('error', shell.inspect)
                server.listen(port, function() {
                    var listener = this.address();
                    listener.protocol = 'ssh' 
                    listener.state = 'listening'
                    listener.kill = kill;
                    function kill(){
                        var index = sockets.indexOf(listener);
                        sockets.splice(index,1)
                        server.close()
                    }
                    sockets.push(listener)
                    shell.inspect(listener)

                });
                
                function connection(client, info){
                    shell.inspect(info)
                    var connector = {
                        address:info.ip, 
                        family:'IPv' + net.isIP(info.ip), 
                        port:port,
                        protocol:'ssh',
                        state:'connected',
                        diconnect:diconnect
                    }    
                    function diconnect(){
                        var index = sockets.indexOf(connector);
                        sockets.splice(index,1)
                        client.end()
                    }
                    sockets.push( connector)
                    var stream;
                    client.on('authentication', function(ctx) {
                        //shell.inspect(ctx)
                        /*
                         *  ctx.username
                         *  ctx.password
                         *  ctx.prompt(prompt, callback)
                         *  ctx.method = ('password'||'keyboard-interactive')
                         *  ctx.reject['why']
                         *  ctx.accept()
                         */
                        ctx.accept()
                    })
                    client.on('ready', function() {
                        client.once('session', function(accept, reject) {
                            var rows,
                                cols,
                                term;
                            var session = accept();
                                session.once('pty', function(accept, reject, info) {
                                    shell.inspect(info)
                                    rows = info.rows;
                                    cols = info.cols;
                                    term = info.term;
                                    accept && accept();
                                });
                                session.on('window-change', function(accept, reject, info) {
                                    shell.inspect(info)
                                    rows = info.rows;
                                    cols = info.cols;
                                    if (stream) {
                                        stream.rows = rows;
                                        stream.columns = cols;
                                        stream.emit('resize');
                                    }
                                    accept && accept();
                                });
                                session.once('shell', function(accept, reject) {
                                    stream = accept();
                                    if(typeof stream.id === 'undefined'){
                                        stream.id = uuidV4()
                                    }
                                    
                                    var _stream = {
                                        uuid:stream.id,
                                        family:'ssh',
                                        protocol:'tty',
                                        kill:kill
                                        
                                    }
                                    function kill(){
                                        var index = streams.indexOf(_stream)
                                        streams.splice(index,1)
                                        stream.end()
                                    }
                                    streams.push(_stream)
                                    
                                    stream.rows = rows || 24;
                                    stream.columns = cols || 80;
                                    stream.isTTY = true;
                                    stream.setRawMode = noop;
                                    stream.on('error', noop);
                                    var sshshell = new nms();
                                    stream.pipe(sshshell).pipe(stream)
                                    sshshell.on('finish',function(){
                                        kill()
                                    })
                                
                                });
                        });
                    })
                    client.on('end', function() { if (typeof stream !== 'undefined') {
                        diconnect()
                    }})
                    client.on('error', function(err) { });
                }
    },
        sio:function(port){
                
                var app = express();
                    app.use(express.static(__dirname + '/sio'));
                    app.get('/', function (req, res) {
                        res.sendFile(__dirname + '/sio/client.html');
                    });

                var server = require('https').createServer(shell.context.crypto.files , app);
                io(server).on('connection', connection);
                server.on('error', shell.inspect);
                server.listen(port, function(){
                    var listener = this.address();
                    listener.protocol = 'sio' ;
                    listener.state = 'listening'
                    listener.close = kill;
                    function kill(){
                        var index = sockets.indexOf(listener);
                        sockets.splice(index,1)
                        server.close()
                    }
                    sockets.push(listener)
                    shell.inspect(listener)
                });
                
                
                function connection(client){
                    //socket
                    var connector = {
                        address: client.handshake.address, 
                        family:'IPv' + net.isIP( client.handshake.address ), 
                        port:port,
                        protocol:'sio',
                        state:'connected',
                        diconnect:diconnect
                    }    
                    function diconnect(){
                        var index = sockets.indexOf(connector);
                        sockets.splice(index,1)
                        client.disconnect()
                    }
                    sockets.push(connector)
                    
                    function textInterface(stream){
                        if(typeof stream.id === 'undefined'){
                            stream.id = uuidV4()
                        }
                        
                        var _stream = {
                            uuid:stream.id,
                            family:'sio',
                            protocol:'tty',
                            kill:kill
                            
                        }
                        function kill(){
                            var index = streams.indexOf(_stream)
                            streams.splice(index,1)
                            stream.end()
                        }
                        streams.push(_stream)
                        //stream event client binding
                        ss(client).on(stream.id, function(e){
                            stream.emit(e.event,e.data)
                        });
                        stream.on('socket.io',function(e){
                            ss(client).emit(stream.id,e)
                        })
                        //sheldon
                        var sio_shell = new nms();
                        //webshell.context.sheldons = sheldons
                        
                        //pipe stream in/out of sheldon
                        stream.pipe(sio_shell).pipe(stream);
                        
                        //add tools to hammerspace
   
                        //gyro events from endpoint
                        sio_shell.context.gyro = function(){
                            
                            var ansiCube = gyro.cube(sio_shell.stdOut);
                            
                            var gyroStream = ss.createStream({objectMode:true});//

                            ss(client).emit('GYRO', gyroStream, {})
                            
                            gyroStream.on('data',function(data){
                                 ansiCube.draw(data.alpha, data.beta, data.gamma )
                            })
                            gyroStream.on('error',function(data){
                                sio_shell.inspect(data)
    
                            })
                            gyroStream.on('end',function(data){
                                sio_shell.inspect(data)
                            })
                            sio_shell.stdIn.once('kill',function(){
                                gyroStream.end()
                            })
                            
                        }

                        //round trip time to stream endpoint
                        sio_shell.context.rtt = function(){
                            var tx_ms =  Date.now();
                            stream.emit('socket.io',{ event:'rtt', data: tx_ms })
                            return {rtt:'calculating'}
                        }
                        stream.on('rtt',function(tx_ms){
                            var rx_ms = Date.now();
                            sio_shell.inspect( { rtt: rx_ms - tx_ms   } )
                        })
                        stream.on('window-change',function(info){
                            sio_shell.inspect(info)
                                    rows = info.rows;
                                    cols = info.cols;
                            if (stream) {
                                stream.rows = rows;
                                stream.columns = cols;
                                stream.emit('resize');
                                stream.emit('socket.io',{ event:'resize', data:info })
                            }
                        })
                        
                        //pipe remote sheldon in/out of stream endpoint
                        sio_shell.context.browser = function(){
                           var s = ss.createStream();
                           ss(client).emit('sheldon', s, {})
                           sio_shell.bypass(s,s)

                        }
                        sio_shell.context.editor = function(path){
                            var Document  = new ace.Document('');
                            var s = ss.createStream({objectMode:true});
                            ss(client).on(s.id, function(e){
                                s.emit(e.event,e.data)
                            });
                            ss(client).emit('EDITOR', s, {})
                            s.on('data',function(data){
                                Document.setByAPI = true;
                                Document.applyDeltas([data.data]);
                                Document.setByAPI = false;
                            })
                            s.on('save',function(){
                                //console.log(Document.getValue());
                                fs.writeFileSync(path, Document.getValue(), 'utf8')
                                sio_shell.inspect({type:'write', path:path })
                            })
                            s.on('share',function(){
                                
                            })
                            Document.on('change', function(delta){
                                if(!Document.setByAPI){
                                    s.write(delta)
                                }
                            })
                            Document.setByAPI = false;
                            sio_shell.inspect({type:'read', path:path })
                            Document.setValue(fs.readFileSync(path, 'utf8'))
                            
                        }
                        sio_shell.context.demo.splash();
                    }

                    ss(client).on('TERMINAL', textInterface )
                    
                }

            },
        radius:function(port){
            var server = new radius.Server();
            server.on('listening',function(){
                var listener = this.address();
                    listener.protocol = 'radius' ;
                    listener.state = 'listening'
                    listener.close = kill;
                    function kill(){
                        var index = sockets.indexOf(listener);
                        sockets.splice(index,1)
                        server.close()
                    }
                    sockets.push(listener)
                    shell.inspect(listener)
            })
            server.on('error',shell.inspect)
            server.bind(port||1812)
        }
    }
    
    var clients = {
        ssh:function(endpoint, username, password) {
                var client = new ssh.Client();
                var argv = {
                    _:[],
                    host:endpoint.split(':')[0],
                    port:endpoint.split(':')[1]||22,
                    username:username,
                    password:password
                }
                var keyArray = ['host','port','username','password']
                shell.util.promptArgs( argv, keyArray , function(valArray){
                     
                    client.connect( _.zipObject(keyArray,valArray) );
                    return('connecting to ' + endpoint);
                })
                
                
                client.on('error', shell.inspect);
                client.on('ready', openShell);
                client.on('end', client.destroy);
                function openShell(){
                    client.shell(connect);
                }
                function connect(error,sshStream){
                    if(error){ return }
                    shell.bypass(sshStream.stdin, sshStream.stdout)
                }        
    },
        telnet:function(endpoint){
                var params = {
                    host:endpoint.split(':')[0],
                    port:endpoint.split(':')[1]
                }
                params.port = !Number.isNaN(parseInt(params.port))? parseInt(params.port) : 23;
                
                var connection = net.connect(params, function() {
                        var telnet = new telnetClient(); 
                        shell.bypass( connection.pipe(telnet.rx), telnet.tx.pipe(connection)  )
                });
                connection.on('error',  shell.inspect) 
                return('connecting to ' + endpoint);        
    },
        kafka:{
            topics:function(callback){
                producer.client.zk.client.getChildren("/brokers/topics", (err, children, stats) => {
                    callback(children)
                  //children.forEach(child => console.log(child));
                })
                return callback
            },
            producer:producer,
            consume:function(topic){
                var Client      = new kafka.Client();
                Client.on('error',function(err){
                    console.log(err)
                });
                var local_consumer = new Consumer( Client, [],{ encoding: 'buffer' })
                local_consumer.addTopics([{ topic: topic, offset: 0 }], function (err, added) {
                    console.log('consumer.addTopics', err,added)
                    
                }, true);
                
                local_consumer.on('message', function (message) {
                    //console.log('consumer.message', util.inspect(message,false, 10, true));
                    shell.stdOut.write(message.value)
                });
            },
            produce:function(topic){
                //ansi.topic
                dataLogger.createLog(shell,topic,function(){
                    
                })
            },
            playback:function(topic,speed){
                
            }
        }
        
    }
    
    
    if(typeof shell.id === 'undefined'){
            shell.id = uuidV4()
    }

    

    shell.context.os        = os;
    shell.context.demo      = {
        cube: function(){
                        var mat4 = glmatrix.mat4;
                        var vec3 = glmatrix.vec3;
                        vec3.transformMat4 = function(out, a, m) {
                            var x = a[0], y = a[1], z = a[2], w = m[3] * x + m[7] * y + m[11] * z + m[15];
                            w = w || 1.0;
                            out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
                            out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
                            out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
                            return out;
                        };
                        
                        var c = new Canvas(160, 160);
                        
                        var points = [[-1,-1,-1],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]];
                        var quads = [[0,1,2,3],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[4,7,6,5]];
                        var cube = quads.map( function(quad) {
                            return quad.map( function(v) {
                                return vec3.fromValues.apply(null, points[v]); });
                        });
                        
                        var projection = mat4.create();
                        mat4.perspective(projection, Math.PI/3, 1, 1, 50);
                        
                        function draw() {
                          var now = Date.now();
                          var modelView = mat4.create();
                          mat4.lookAt(modelView,
                                      vec3.fromValues(0, 0.1, 4),
                                      vec3.fromValues(0, 0, 0),
                                      vec3.fromValues(0, 1, 0));
                                     
                          mat4.rotateY(modelView, modelView, Math.PI*2*now/10000);
                          mat4.rotateZ(modelView, modelView, Math.PI*2*now/11000);
                          mat4.rotateX(modelView, modelView, Math.PI*2*now/9000);
                          
                          mat4.scale(modelView, modelView, vec3.fromValues(Math.sin(now/1000*Math.PI)/2+1, 1, 1));
                          c.clear();
                          var transformed = cube.map(function(quad) {
                            return quad.map(function(v) {
                              var m = mat4.create();
                              var out = vec3.create();
                              mat4.mul(m, projection, modelView);
                              vec3.transformMat4(out, v, m);
                              return {
                                x: Math.floor(out[0]*40+80),
                                y: Math.floor(out[1]*40+80)
                              };
                            });
                          });
                          transformed.forEach(function(quad) {
                            quad.forEach(function(v, i) {
                              var n = quad[(+i+1)%4];
                              bresenham(v.x, v.y, n.x, n.y, c.set.bind(c));
                            });
                          });
                          shell.stdOut.write(c.frame());
                        }
                        
                        var timeout = setInterval(draw, 1000/15);
                        
                        shell.stdIn.once('kill',function(){
                            clearInterval(timeout)
                        })
                    },
        clock: function(){
            var c = new Canvas(160, 160);

            function draw() {
              c.clear();
              var t = new Date();
              var sin = function(i, l) {
                return Math.floor(Math.sin(i*2*Math.PI)*l+80);
              }, cos = function(i, l) {
                return Math.floor(Math.cos(i*2*Math.PI)*l+80);
              };
              bresenham(80, 80, sin(t.getHours()/24, 30), 160-cos(t.getHours()/24, 30), c.set.bind(c));
              bresenham(80, 80, sin(t.getMinutes()/60, 50), 160-cos(t.getMinutes()/60, 50), c.set.bind(c));
              bresenham(80, 80, sin(t.getSeconds()/60+(+t%1000)/60000, 75), 160-cos(t.getSeconds()/60+(+t%1000)/60000, 75), c.set.bind(c));
              shell.stdOut.write(c.frame());
            }
            
            var timeout = setInterval(draw, 1000/15);
            shell.stdIn.once('kill',function(){
                clearInterval(timeout)
            })
        },
        dashboard : function(){
            shell.listening = false;
            var db = new dashboard(shell.stdIn, shell.stdOut)      ;
            shell.stdIn.once('kill',function(){
                shell.listening = true;
            })
            
            
            
        },
        art : function(){
            var urls = fs.readFileSync('./blessed/ansi-art.list', 'utf8').trim().split('\n');
            var i = 0;
            var end = false;
            
            function getit(){
                if(end){ return; }
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
                
                var ans = request(urls[i]);
                
                //ans.on('close',     function (){ shell.inspect('close')})
                //ans.on('end',       function (){ shell.inspect('end'); })
                ans.on('error',     shell.inspect)
                //ans.on('readable',  function (){ shell.inspect('readable')})
                
                i++;
                if(i === urls.length -1){ i=0;}
                var decoder = iconv.decodeStream('cp437')
                var throttle = new Throttle({rate: 9600})
                //throttle.on('close',     function (){ shell.inspect('close')})
                throttle.on('end',       function (){ 
                    throttle.unpipe(), 
                    shell.inspect(urls[i-1])
                    setTimeout(getit,5000);
                    })
                throttle.on('error',     shell.inspect)
                //throttle.on('readable',  function (){ shell.inspect('readable')})
                ans
                    .pipe( throttle )
                    .pipe(  decoder)
                    .pipe( shell.stdOut , {end:false})
                
            }
            
            getit()
            
            
            shell.stdIn.once('kill',function(){
                if(typeof throttle != 'undefined'){
                    throttle.unpipe();
                    decoder.unpipe();
                }
               end = true;
            })
            
            
            
            
        },
        splash : function(){
        var decoder = iconv.decodeStream('cp437')
        var throttle = new Throttle({rate: 9600})
        //throttle.on('close',     function (){ shell.inspect('close')})
        throttle.on('end',       function (){ throttle.unpipe(); shell.inspect('welcome') })
        throttle.on('error',     shell.inspect)
        //throttle.on('readable',  function (){ shell.inspect('readable')})
        fs.createReadStream('../lib/sheldon/lib/sheldon.asn')
            .pipe( decoder )
            .pipe( throttle )
            .pipe( shell.stdOut , {end:false})
    }
    }
    shell.context.services  = {
        sheldons:sheldons,
        dataLogger:dataLogger
    }
    shell.context.network   = {
        servers:servers,
        clients:clients,
        sockets:sockets,
        streams:streams
    }

    /*
    dataLogger.createLog(shell.stdIn,   shell.id + '--I',function(){
        dataLogger.createLog(shell,         shell.id + '--O',function(){
            
        }) 
    })  
    */
    return shell
    
}


//nms( process.stdin, process.stdout );



