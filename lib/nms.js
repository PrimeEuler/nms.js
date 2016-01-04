var telnetClient    = require('./telnet-client'),
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
    snmpSession     = new snmp.Session({});
    mib             = new MIB();
    mib.LoadMIBs();
function nms(stream){
        var NMS = new sheldon(stream);
        NMS.context.nms = {
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
                    function attach(error,shellStream){
                         NMS.vty.attach(shellStream,error)
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
                                .pipe(telnet.stdin)
                                .pipe(stream,{end:false})
                                .pipe(telnet.stdout)
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
                            var PIPE_PATH = path.join('\\\\.\\pipe', process.cwd(), pipeName);
                            var connection = net.connect(PIPE_PATH, function() {
                                    NMS.vty.attach(connection)
                                })
                                connection.on('error',  NMS.cli.inspect)
                                connection.on('end', connection.destroy);
                                return('connecting to ' + pipeName);
                                
                        },
                listen:function(pipeName){
                            
                            var PIPE_PATH = path.join('\\\\.\\pipe', process.cwd(), pipeName);
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
                                    NMS.vty.stdout.on('resize',function(e){
                                        connection.columns   = e.cols;
                                        connection.rows = e.rows;
                                        console.log(e)
                                    })
                                switch(pipeName){
                                    case 'sheldon':
                                        var mySheldon = new sheldon(connection)
                                        mySheldon.context.NMS = NMS
                                        break;
                                    case 'art':
                                        var demo1 = new ansiviewer(connection)
                                        break;
                                    case 'dashboard':
                                        var demo2 = new dashboard(connection)
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
            }
        }
        return NMS;
}
module.exports = nms;