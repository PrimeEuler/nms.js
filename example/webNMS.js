var shellServer     = require('../lib/shellServer'),
    nms             = require('../'),
    util            = require('util'),
    requirejs       = require("requirejs");
    requirejs.config({
        baseUrl: __dirname + '/ace/',
        nodeRequire: require
    })
    var ace         = requirejs('document');
    var webNMS      = new shellServer();
    webNMS.on('connection', function (socket) {
        
        socket.on('TERMINAL', function(stream){
                //hack for socket.io-stream events client bind
                socket.on(stream.id, function(e){
                    stream.emit(e.event,e.data)
                });
                stream.on('socket.io',function(e){
                    //console.log(e)
                    socket.emit(stream.id,e)
                })
                var NMS = new nms(stream);
                NMS.context.nms.edit = function(path){
                        function evalInContext(js, context) {
    //# Return the results of the in-line anonymous function we .call with the passed context
                            return function() { return eval(js); }.call(context);
                        }
                        var editStream = webNMS.createStream({objectMode: true})
                        socket.on(editStream.id, function(e){
                            editStream.emit(e.event,e.data)
                        });
                        var ACE = new ace.Document('');
                        editStream.setEncoding('utf8');
                        socket.emit('EDITOR', editStream );
                        editStream.on('data',function(data){
                            //console.log(data)
                            if(data.version > ACE.version){
                                ACE.setByAPI = true;
                                ACE.applyDeltas([data.data]);
                                ACE.setByAPI = false;
                            }
                        })
                        editStream.on('save',function(){
                            //evalInContext( ACE.getValue() ,  NMS.context)
                            var code =  ACE.getValue()
                                //NMS.cli.inspect(code);
                                
                                try{
                                    eval('NMS.context.' + code)
                                    var _path = code.split('=')[0].split(' ')[0];
                                    //var ob = NMS._.get(NMS.context, _path);
                                    NMS.cli.inspect({save:true, path:_path});
                                    NMS.cli.prompt();
                                    //console.log(code)
                                }catch(e){
                                    NMS.cli.inspect(e)
                                }
                        })
                        editStream.on('share',function(){
                            NMS.cli.inspect({share:true, id:editStream.id});
                            NMS.cli.prompt();
                        })
                        
                        ACE.version = 0;
                        ACE.on('change', function (delta){
                            
                            if (!ACE.setByAPI) {
                                ACE.version++;
                                delta.version = ACE.version;
                                editStream.write(delta)
                                //console.log(delta)
                            }
                        });
                        var contents =  NMS._.get(NMS.context, path);
                        
                        switch(typeof contents){
                            case 'object':
                                contents =  path + ' = ' + util.inspect(contents, false,null);
                                break;
                            case 'function':
                                contents =  path + ' = ' + contents.toString();
                                break;
                            case 'undefined':
                                break;
                            case 'symbol':
                            case 'boolean':
                            case 'number':   
                            case 'string':
                            default:
                                contents =  path + ' = ' + contents.toString();
                                break;
        
                        }
                        //console.log(contents)
                        ACE.insert({ row: 0, column: 0},   contents );
                    }
            })
        

    });
    webNMS.listen({port:8443});