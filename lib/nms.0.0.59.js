var express         = require('express'),
    io              = require('socket.io'),
    ss              = require('socket.io-stream'),
    ssh             = require('ssh2'),
    crypto          = require('crypto'),
    fs              = require('fs'),
    net             = require('net'),
    os              = require('os');
var util            = require('util');
var sheldon         = require('../../sheldon/')
var kafka           = require('kafka-node');
var redis           = require("redis");
var BJSON           = require('serialize-json');
var JPATH           = require('jsonpath');
var MIB             = require('../lib/mib/lib/RFC_BASE_MINIMUM.json')
var snmp            = require('snmp-native');
var snmpSession     = new snmp.Session({});
var client          = new kafka.Client();
var producer        = new kafka.Producer(client);
var offset          = new kafka.Offset(client);
    client.on('error',console.log)
    producer.on('error',console.log)
    offset.on('error', console.log)

var app = express();
    app.use(express.static(__dirname + '/sio'));
    app.get('/', function (req, res) { res.sendFile(__dirname + '/sio/client.html'); });
var OID = {};

function DEFINITION(ObjectName){
    var Definition  = MIB[ ObjectName ];
    var DefType     = TYPE_OF( Definition );
    var syntax = [];
    switch(DefType){
        case 'string':
            syntax[0]   = Definition
            break;
        case 'array':
            syntax      = Definition
            break;
        case 'object':
            syntax[0]   = Object.keys(Definition)[0]
            syntax[1]   = Definition[ syntax[0] ]
            //ApplicationSyntax
            if(syntax[0]==='tag'){
                
                switch(TYPE_OF( Definition.type)){
                    case 'string':
                        syntax = [Definition.type]
                        break;
                    case 'array':
                        syntax = Definition.type
                        break;
                    default:
                        break;
                        
                }
                //console.log(ObjectName, util.inspect( syntax, false, 10, true))
            }
            break;
    }
    //console.log(util.inspect(syntax, false, 10, true))
    return syntax
}
function TYPE_OF(object){
    var type     = typeof object;
        if(Array.isArray(object)){type = 'array'}
        
    return type
}
function OID_VALUE(ObjectName){
    var OBJECT = DEFINITION(ObjectName)
    var objectID_value = [];
    var oid = []
    
    if(OBJECT[1] && OBJECT[1]['::=']){
        objectID_value = OBJECT[1]['::=']
    }else{
        //console.log(OBJECT[0])
        return
    }
    if(typeof objectID_value[0] === 'number'){
        oid = objectID_value
    }else{
        oid.unshift(objectID_value[1])
        while(objectID_value[0]!=='root' && MIB[objectID_value[0]] ){
            objectID_value = MIB[ objectID_value[0] ][ Object.keys( MIB[ objectID_value[0] ] )[0] ]['::=']
            oid.unshift(objectID_value[1])
        }
    }
    return oid.join('.')



}
function SYNTAX_OF(object){
        if( object.length===1 ){ return object }
    var syntax  = object[1]['SYNTAX'];
    var synType = TYPE_OF( syntax )

        if( synType === 'string' ){
            syntax   =  [syntax]
        }else if(synType === 'undefined'){
            syntax  = object
        }
        return syntax
}
function SYNTAX_CHAIN(SYNTAX){
        var chain = []
        if(!MIB[SYNTAX[0]]){
                //SimpleSyntax
                return SYNTAX
               // console.log(ObjectName, util.inspect(SYNTAX, false, 10, true))
                
        }else{
            chain = chain.concat(SYNTAX)
            while(MIB[SYNTAX[0]]){
                OBJECT = DEFINITION(SYNTAX[0])
                SYNTAX = SYNTAX_OF(OBJECT)
                chain = chain.concat(SYNTAX)
            }
            return chain
            //console.log(ObjectName, util.inspect( SYNTAX, false, 10, true))
            
        }
}
function mibCompileV3(){
    //SMIv2 SNMPv2
    var MACRO = {
        'IMPORTS':function(){
            
        },
        'EXPORTS':function(){
            
        },
        //TYPE NOTATION
        'OBJECT-TYPE':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            var SYNTAX = SYNTAX_OF(OBJECT)
            var chain = []
            //VALUE NOTATION ::= value(VALUE ObjectName)
            if(OBJECT[1].INDEX){
                //SYNTAX.push(['INDEX',OBJECT[1].INDEX])
            }
            //return SYNTAX
            
            if(!MIB[SYNTAX[0]]){
                //SimpleSyntax
                return SYNTAX
               // console.log(ObjectName, util.inspect(SYNTAX, false, 10, true))
                
            }else{
                chain = chain.concat(SYNTAX)
                while(MIB[SYNTAX[0]]){
                    OBJECT = DEFINITION(SYNTAX[0])
                    SYNTAX = SYNTAX_OF(OBJECT)
                    chain = chain.concat(SYNTAX)
                }
                return chain
                //console.log(ObjectName, util.inspect( SYNTAX, false, 10, true))
                
            }
            
        },
        'MODULE-IDENTITY':function(ObjectName){
            //INFORMATIONAL
            //VALUE NOTATION ::= value(VALUE OBJECT IDENTIFIER)
            return ObjectName
        }, 
        'OBJECT-IDENTITY':function(ObjectName){
            //INFORMATIONAL
            //VALUE NOTATION ::= value(VALUE OBJECT IDENTIFIER)
            return ObjectName
        }, 
        'NOTIFICATION-TYPE':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            //VALUE NOTATION ::= value(VALUE NotificationName)
            return OBJECT[1].OBJECTS
        },
        'OBJECT-GROUP':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
             //VALUE NOTATION ::= value(VALUE OBJECT IDENTIFIER)
            return OBJECT[1].OBJECTS
        },
        'NOTIFICATION-GROUP':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            //VALUE NOTATION ::= value(VALUE OBJECT IDENTIFIER)
            return OBJECT[1].NOTIFICATIONS
        },
        'MODULE-COMPLIANCE':function(ObjectName){
             //VALUE NOTATION ::= value(VALUE OBJECT IDENTIFIER)
            return ObjectName
        },
        'AGENT-CAPABILITIES':function(ObjectName){
             //VALUE NOTATION ::= value(VALUE OBJECT IDENTIFIER)
            return ObjectName
        },
        'TEXTUAL-CONVENTION':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            var SYNTAX = SYNTAX_OF(OBJECT)
            //VALUE NOTATION ::= value(VALUE Syntax)
            return SYNTAX
            
            if(!MIB[SYNTAX[0]]){
                return SYNTAX
                //console.log(ObjectName, util.inspect(SYNTAX, false, 10, true))
            }else{
                OBJECT = DEFINITION(SYNTAX[0])
                SYNTAX = SYNTAX_OF(OBJECT)
                return SYNTAX
                //console.log(ObjectName, util.inspect( SYNTAX, false, 10, true))
                
            }
        },
        'TRAP-TYPE':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            //console.log(OBJECT[1]['::='])
        },
        //VALUE NOTATION
        '::=':function(ObjectName){
            
        }
    }
    //ASN1
    var StructuredType = {
        'SEQUENCE':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            return(OBJECT[1])
            //console.log(util.inspect(['INDEX',OBJECT[1].INDEX], false, 10, true))
            //console.log(OBJECT)
        },
        'SEQUENCE OF':function(){
            
        },
        'SET':function(){
            
        },
        'SET OF':function(){
            
        },
        'CHOICE':function(){
            
        },
        'SELECTION':function(){
            
        },
        'ANY':function(){
            
        }
    }
    /*
    -- the "base types" defined here are:
    --   3 built-in ASN.1 types: INTEGER, OCTET STRING, OBJECT IDENTIFIER
    --   8 application-defined types: Integer32, IpAddress, Counter32,
    --              Gauge32, Unsigned32, TimeTicks, Opaque, and Counter64
    */
    var SimpleSyntax = {
        'OBJECT IDENTIFIER':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
            if(OBJECT[1] && OBJECT[1]['::=']){
                var oid = OID_VALUE( ObjectName )
                //console.log(util.inspect(oid, false, 10, true))
                return oid
            }else{
                console.log(ObjectName, util.inspect(OBJECT, false, 10, true))
                return ObjectName
            }
            
        },
        'OCTET STRING':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
        },
        'INTEGER':function(ObjectName){
            var OBJECT = DEFINITION(ObjectName)
        }
    }
    var ApplicationSyntax = {
        
    }
    Object.keys(snmp.DataTypes).forEach(function(DataType){
        ApplicationSyntax[snmp.DataTypes[DataType]] = DataType
    })
    Object.keys(MIB).forEach(function(ObjectName){
        if(MACRO[ObjectName]){
            //MACRO DEFINITION
        }else{
            //OBJECT DEFINITION
            var OBJECT = DEFINITION(ObjectName);
            var SYNTAX = MACRO[ OBJECT[0] ] || SimpleSyntax[ OBJECT[0] ] || StructuredType[ OBJECT[0] ] 
                
                

            
            if(SYNTAX){
                //SYNTAX(ObjectName)
                if(OBJECT[0] === 'TEXTUAL-CONVENTION' ||OBJECT[0] === 'SEQUENCE'  ){
                    //console.log(ObjectName, OBJECT[0], util.inspect(SYNTAX(ObjectName), false, 10, true))
                }else{
                    OID[OID_VALUE( ObjectName )] = ObjectName
                    console.log(ObjectName, OBJECT[0], util.inspect(SYNTAX(ObjectName), false, 10, true))
                }
            }
            
        }
        
        
    })

}


mibCompileV3()

    
const network = {
    kafka:{
        topics:function(callback){
            producer.client.zk.client.getChildren("/brokers/topics", (err, children, stats) => {
                callback(children)
            })
            return callback
        },
        offsets:function(topic,callback){
            offset.fetchLatestOffsets( [topic], function(err,offsets){ callback(err||offsets) });
            return callback
        },
        consume:function(topic,offset,stream,shell,objectMode){
            var client      = new kafka.Client()
            var consumer    = new kafka.Consumer( client, [], { encoding: 'buffer' } )
            var flowing     = true;
                client.on('error', shell.REPL.PRINT.ansi )
                consumer.on('error', shell.REPL.PRINT.ansi)
                consumer.on('message', function (message) {
                    if(objectMode){
                        message.value = BJSON.decode(message.value)
                    }
                   flowing =  stream.write(message.value);
                   if(flowing===false){
                       consumer.pause()
                   }
                })
                stream.on('drain',function(){
                    consumer.resume()
                })
                stream.on('close',function(){
                    
                    consumer.close(function(){
                        shell.REPL.PRINT.ansi( {consumer:'close'});
                    })
                    
                })
                stream.on('setOffset',function(offset){
                    console.log(offset)
                    consumer.setOffset(topic, 0, offset);
                })
                consumer.addTopics( [{ topic:topic , offset: offset}], function (err, data) {
                    shell.REPL.PRINT.ansi( err || data );
                
                }, true);
        }
    },
    redis:{
        redisClient : redis.createClient
    },
    crypto:{
        hostKeys:  [{ key: fs.readFileSync('./crypto/host.key'), passphrase:'password' } ],
        privateKey: fs.readFileSync('./crypto/host.key'),
        key:        fs.readFileSync('./crypto/host.key'),
        cert:       fs.readFileSync('./crypto/host.crt'),
        passphrase: 'password'
    },
    sio:{
        authenticate:function(socket){
                //Authenticate, Authorize, Accouting
                var auth = true
                if(!auth){
                    return socket.disconnect();
                    
                }
                //socket rpc
                socket.on('kafka.topics', function(ack){
                    network.kafka.topics(ack)
                })
                socket.on('kafka.offsets', function(topic,ack){
                    network.kafka.offsets(topic, ack)
                })
                socket.on('fs.readFileSync', function(path){
                    
                });
                //streams
                ss(socket).on('shell',function(stream){
                    network.sio .bind(socket, stream)
                    var shell = new sheldon.shell();
                        stream.pipe(shell).pipe(stream)
                        shell.context.os = os
                        shell.context.network= network;
                })
                
                ss(socket).on('kafka.consume', function(stream,options){
                        network.sio.bind(socket, stream)
                        network.kafka.consume(options.topic, options.offset, stream, shell, options.objectMode )
                    
                })
                ss(socket).on('kafka.produce', function(stream,options){
                        network.sio.bind(socket, stream)
                        producer.createTopics([ options.topic ], false, function (err, data) {
                            shell.REPL.PRINT.ansi( err || data );
                            stream.on('data',function(data){  
                               if(options.objectMode){
                                  data = BJSON.encode(data) 
                               } 
                               producer.send([{ topic: options.topic , messages: data, partition: 0 }],function noop(){})
                            })
                        })
                    
                    
                })
                ss(socket).on('kafka.prosume', function(stream,options){
                        network.sio.bind(socket, stream)
                        producer.createTopics([ options.topic ], false, function (err, data) {
                            shell.REPL.PRINT.ansi( err || data );
                            stream.on('data',function(data){  
                                data = BJSON.encode(data)
                                producer.send([{ topic: options.topic , messages: data, partition: 0 }],function noop(){})
                            })
                        })
                        network.kafka.consume(options.topic, options.offset, stream, shell, true )
                    
                    
                })
                
        },
        connection:function(socket, shell){
            var _socket = {
                address: socket.handshake.address, 
                family:'IPv' + net.isIP( socket.handshake.address ), 
                port:socket.handshake.headers.host.split(':')[1],
                protocol:'sio',
                state:'connected',
                diconnect:diconnect,
                handshake:socket.handshake
            }    
                function diconnect(){
                    var index = network.sockets.indexOf(socket);
                    network.sockets.splice(index,1)
                    socket.disconnect()
                }
                socket._disonnect = diconnect
                network.sockets.push(socket)
                //auth
                network.sio.authenticate(socket)

                

            
        },
        listen:function(port,shell){
            var server = require('https').createServer(network.crypto , app);
                io(server).on('connection', function(socket){
                    network.sio.connection(socket,shell)
                    
                });
                server.on('error', shell.REPL.PRINT.ansi);
                server.listen(port, function(){
                    var listener = this.address();
                        listener.protocol = 'sio' ;
                        listener.state = 'listening'
                        listener.close = close;
                    function close(){
                        var index = network.servers.indexOf(listener);
                        network.servers.splice(index,1)
                        server.close()
                    }
                    network.servers.push(listener)
                    shell.REPL.PRINT.ansi(listener)
                });
        },
        bind:function(socket, stream){
            ss(socket).on(stream.id, function(e){
                stream.emit(e.event,e.data)
            });
            stream.on('socket.io',function(e){
                ss(socket).emit(stream.id,e)
            })
        }
    },
    ssh:{
        connect:function(endpoint, username, password, callback, shell){
            var client = new ssh.Client();
            var argv = {
                _:[],
                host:endpoint.split(':')[0],
                port:endpoint.split(':')[1]||22,
                username:username,
                password:password
            }
            client.connect(argv)
            callback({ endpoint:endpoint, state:'connecting'} )
            client.on('error', end);
            client.on('ready', openShell);
            client.on('end', end );
            function openShell(){
                callback({ endpoint:endpoint, state:'ready'} )
                client.shell(connect);
            }
            function connect(error,sshStream){
                if(error){ return }
                callback({ endpoint:endpoint, state:'connected'})
                shell.settings.listening = false
                shell.stdin.pipe(sshStream.stdin)
                
                sshStream.stdout.pipe(shell.stdout,{end:false})
                sshStream.stdout.on('close',function(){
                    callback({ endpoint:endpoint, state:'closed'  } )
                    shell.settings.listening = true
                    //shell.stdin.unpipe(shell.stdout)
                    shell.stdin.resume()
                    
                    
                })
            }
            function end(err){
                if(err){
                    callback(err)
                }
                shell.stdin.resume()
                shell.settings.listening = true
                client.destroy()
                
            }

            
        }
    },
    snmp:{
        PDU:{
            GetRequest:{
                
            },
            GetNextRequest:{
                
            },
            GetResponse:{
                
            },
            SetRequest:{
                
            },
        },
        get:function(oid,host,community, callback){
            snmpSession.get({oid:oid,host:host,community:community}, function (error, varbinds){
                if(error){
                    callback(error)
                }else{
                    callback(varbinds)
                }
            } )
        },
        getNext:function(oid,host,community, callback){
            snmpSession.getNext({oid:oid,host:host,community:community}, function (error, varbinds){
                if(error){
                    callback(error)
                }else{
                    callback(varbinds)
                }
            } )
        },
        getSubtree:function(oid,host,community, callback){
            snmpSession.getSubtree({oid:oid,host:host,community:community}, function (error, varbinds){
                if(error){
                    callback(error)
                }else{
                    //callback(varbinds)
                    network.snmp.varBinds(varbinds,callback)
                }
            } )
        },
        ObjectName:function(oid,callback){
            callback(OID[oid])
        },
        OID:function(ObjectName,callback){
                 if(! MIB[ObjectName]){ return }
            var parent = MIB[ObjectName][Object.keys(MIB[ObjectName])[0]]['::='] 
                if(!parent){ return }
            var parentName = parent[0]
            var parentIndex = parent[1]
            var oid = parentIndex;
                while(parentName!=='root' && MIB[parentName]){
                        parent = MIB[parentName][Object.keys(MIB[parentName])[0]]['::='] 
                        parentName = parent[0]
                        parentIndex = parent[1]
                        oid = parentIndex + '.' + oid
                }
            return oid
        },
        varBinds:function(varBinds,callback){
            var bindings = [];
            varBinds.forEach(function(varBind){
                var bind = {}
                //KV[varBind.oid.join('.')] = varBind.value
                //bindings.push(KV)
                //console.log(KV)
                var end = varBind.oid.length-1 
                var oid = varBind.oid.slice(0,end).join('.')
                var index = varBind.oid.slice(end).join('.')
                var ObjectName = OID[oid]
                    while(!OID[oid]&&end > 0){
                        end--;
                        oid = varBind.oid.slice(0,end).join('.')
                    }
                    index = varBind.oid.slice(end).join('.')
                    ObjectName = OID[oid] 
                    bind[ObjectName] = {};
                var OBJECT = DEFINITION(ObjectName)
                    bind[ObjectName].SYNTAX = SYNTAX_CHAIN(SYNTAX_OF(OBJECT))
                    //KV[ObjectName][INDEX] = varBind.value
                    bind[ObjectName].INDEX = index
                    bind[ObjectName].VALUE = varBind.value
                    bindings.push(bind)
            })
            callback(bindings)
        }
        
    },
    sockets:[],
    servers:[],
    server:function(port,protocol){
        network[protocol].listen(port,shell)
    },
    stream:{
        kafka:function(mode,topic, stream){
            
        }
    },
    schema:{
        ASN1 :{
            SMIv2 : {
                MIB:MIB,
                OID:OID
            }
        },
    },
    serialize:{
        BJSON:BJSON,
        ANSI:{
            SMV2:{
                encode:function(oid,value){
                    var varBind = {
                        oid:oid,
                        buffer:value
                    }
                    
                },
                decode:function(oid,buffer){
                    
                }
            }
        }
        
    }
}


var shell           = new sheldon.shell()
    shell.context.network = network
    shell.context.os = os

    process.stdin.pipe(shell).pipe(process.stdout)
    




