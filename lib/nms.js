var telnetClient    = require('./telnet-client'),
    RadiusClient    = require('./radius').Client,
    RadiusServer    = require('./radius').Server,
    ansiviewer      = require('./blessed/ansiviewer.js'),
    dashboard       = require('./blessed/dashboard.js'),
    MIB             = require('./mib'),
    sheldon         = require('./sheldon'),
    ssh             = require('ssh2'),
    snmp            = require('snmp-native'),
    net             = require('net'),
    path            = require('path'),
    repl            = require('repl'),
    util            = require('util'),
    snmpSession     = new snmp.Session({}),
    mib             = new MIB(),
    radiusClient    = new RadiusClient(),
    radiusServer    = new RadiusServer();
    radiusServer.on("listening", function () {
        console.log(radiusServer.address())
    });
    radiusServer.bind();
    mib.LoadMIBs();
function nms(STDIN,STDOUT){
        //STDIN     = Keyboard
        //STDOUT    = Screen
        var NMS = new sheldon(STDIN,STDOUT);
        radiusClient.client.on('error',NMS.cli.inspect)
        NMS.access = function(username,password){

                    NMS.cli.access.user = username;
                    NMS.cli.access.pass = password;
                    NMS.cli.access.server = radiusServer.address();
                    NMS.cli.access.code = "Access-Request";
                    
                    //fix listener issue 0.0.0.0
                    NMS.cli.access.server.address = '127.0.0.1'
                    
                    radiusClient["Access-Request"](NMS.cli.access, function(resp){
                        NMS.cli.access = resp
                        NMS.cli.access.server = radiusServer.address();
                        NMS.cli.inspect(NMS.cli.access);
                        NMS.cli.prompt();
                    });
                    delete(NMS.cli.access.pass);
                    return NMS.cli.access
        }
        NMS.vty.emit('line','nms.welcome')
        NMS.modules = {
            ssh:ssh,
            telnetClient:telnetClient,
            mib:mib,
            sheldon:sheldon,
            net:net,
            snmp:snmp,
            repl:repl,
            snmpSession:snmpSession,
            util:util
        }
        
        NMS.context.nms = {
            welcome:'Welcome to NMS.js. Hit Tab for a list of available functions.',
            ssh:    function(host,username,password){
                    var client = new ssh.Client();
                    var params = {
                        host:host.split(':')[0],
                        port:host.split(':')[1],
                        username:username,
                        password:password
                    }
                    client.connect(params);
                    client.on('error', NMS.cli.inspect);
                    client.on('ready', openShell);
                    client.on('end', client.destroy);
                    function openShell(){
                        client.shell(attach);
                    }
                    function attach(error,sshStream){
                        NMS.vty.attach( { 
                            stdin:sshStream, 
                            stdout:sshStream 
                            
                        }, error )
                    }
                    return('connecting to ' + host);
            },
            telnet: function(host){
                    var params = {
                        host:host.split(':')[0],
                        port:host.split(':')[1]
                    }
                    params.port = !Number.isNaN(parseInt(params.port))? parseInt(params.port) : 23;
                    var connection = net.connect(params, function() {
                            var telnet = new telnetClient();  
                            connection
                                .pipe(telnet.rx)
                                .pipe(NMS.vty.stdout,{end:false});
                            NMS.vty.stdin
                                .pipe(telnet.tx)
                                .pipe(connection)
                                .on('end', function(){
                                    NMS.vty.open()
                                    connection.destroy();
                                 })
                            NMS.vty.close();
                    });
                    connection.on('error',  NMS.cli.inspect) 
                    return('connecting to ' + host);
            },
            snmp:   function(request, host,community,oid){
                mib.GetObject(oid, function(Object){
                        //console.log(Object)
                        var params = {
                            host:host,
                            community:community,
                            oid:'.' + Object.OID
                        }
                        snmpSession[request](params, function(error, varbinds){
                            var NameSpaceTable = {};
                            mib.DecodeVarBinds(varbinds, function (VarBinds) {
                                 var bindings = {};
                                VarBinds.forEach(function (vb) {
                                   
                                    if(!bindings[vb.oid]){
                                        bindings[vb.oid]={}
                                    }
                                    bindings[vb.oid][vb.ObjectName] = vb.Value
                                    
                                });
                                NMS.cli.inspect(bindings);
                                NMS.cli.prompt();
                            });


                        })

                    })
            },
            net:    {
                connect:function(pipeName){
                            var p = NMS.context.os.platform() === 'win32'? '\\\\.\\pipe' : '';
                            var PIPE_PATH = path.join(p , process.cwd(), pipeName);
                            var connection = net.connect(PIPE_PATH, function() {
                                    NMS.vty.attach({
                                        stdin:connection,
                                        stdout:connection
                                    })
                                })
                                connection.on('error',  NMS.cli.inspect)
                                return('connecting to ' + pipeName);
                                
                        },
                listen:function(pipeName){
                            var p = NMS.context.os.platform() === 'win32'? '\\\\.\\pipe' : '';
                            var PIPE_PATH = path.join(p, process.cwd(), pipeName);
                            var server = net.createServer(function(connection) {
                                    connection.isRaw      = false;
                                    connection.setRawMode = function(value) {
                                      connection.isRaw = !!value;
                                    };
                                    connection.chunkPaste = true;//emit pasted input - keyperss s.length edit line:
                                    connection.on('readable',function(){
                                          if(connection.isPaused()){
                                              connection.resume();
                                          }
                                    })
                                    
                                    connection.isTTY     = true;
                                    connection.columns   = NMS.vty.stdout.columns;
                                    connection.rows      = NMS.vty.stdout.rows;
                                    connection.on('error',  NMS.cli.inspect) 
                                    NMS.vty.stdout.on('resize',function(){
                                        connection.columns   = NMS.vty.stdout.columns;
                                        connection.rows = NMS.vty.stdout.rows;
                                        //console.log(e)
                                    })
                                    
                                switch(pipeName){
                                    case 'sheldon':
                                        var mySheldon = new sheldon(connection,connection)
                                        mySheldon.context.NMS = NMS
                                        break;
                                    case 'art':
                                        var demo1 = new ansiviewer(connection,connection)
                                        break;
                                    case 'dashboard':
                                        var demo2 = new dashboard(connection,connection)
                                        break;
                                    case 'repl':
                                        var r = repl.start({
                                            input: connection,
                                            output: connection,
                                            prompt: 'repl>', 
                                            terminal: true,
                                            useGlobal: false,
                                            ignoreUndefined:true
                                        }).on('exit', function () {
                                            connection.end();
                                        })
                                        break;
                                    default:
                                        connection.write('\r\ngoodbye ' + pipeName + '\r\n');
                                        connection.end();
                                    break;
                                }
                            })
                            server.on('close',function(){
                                        
                                    })
                            server.on('error',NMS.cli.inspect)
                            server.listen(PIPE_PATH, function(){
                                //shell.vty.cli.inspect('listening @ ' + pipeName)
                            })                            
                         return('listening for ' + pipeName);
                        },
            },
            radius : {
                "Access-Request":function(username,password){
                    //console.log(radiusServer.address());
                    var accessRequest = {
                        user:username,
                        pass:password,
                        uuid:NMS.vty.id,
                        server:radiusServer.address()
                        
                    }
                    //fix listener issue 0.0.0.0
                    accessRequest.server.address = '127.0.0.1'
                    
                    radiusClient["Access-Request"](accessRequest, NMS.cli.inspect);
                    
                    return {
                        uuid:NMS.vty.id,
                        user:username,
                        code:"Access-Request" 
                        
                    }
                },
                server:{
                    settings:{
                        ip:'127.0.0.1',
                        port:1812
                    },
                    start: function(){
                        NMS.context.nms.radius.server = new RadiusServer();
                        var server = NMS.context.nms.server;
                        server.on("listening", function () {
                            var address = server.address();
                            NMS.cli.inspect(address)
                        });
                        server.on('error',NMS.cli.inspect);
                        //server.on('packet',NMS.cli.inspect)
                        server.bind(1812);
                    }
                }
            }
        }
        return NMS;
}
module.exports = nms;
