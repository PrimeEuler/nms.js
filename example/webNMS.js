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
                            var code = 'NMS.context.' + ACE.getValue()
                            //console.log(code)
                                try{
                                    eval(code)
                                }catch(e){
                                    NMS.cli.inspect(e)
                                }
                        })
                        editStream.on('share',function(){
                            console.log('share ' + editStream.id)
                        })
                        
                        ACE.version = 1;
                        ACE.on('change', function (delta){
                            //console.log(delta)
                            if (!ACE.setByAPI) {
                                ACE.version++;
                                delta.version = ACE.version;
                                editStream.write(delta)
                            }
                        });
                        var contents =  NMS._.get(NMS.context, path);
                        
                        switch(typeof contents){
                            case 'object':
                                contents =  path + ' = ' + util.inspect(contents, false,null);
                                break;
                            case 'symbol':
                                break;
                            case 'function':
                                contents =  path + ' = ' + contents.toString();
                                break;
                            case 'undefined':
                            case 'boolean':
                            case 'number':   
                            case 'string':
                            default:
                                break;
        
                        }
                        //console.log(contents)
                        ACE.insert({ row: 0, column: 0},   contents );
                    }
            })
        

    });
    webNMS.listen({port:8443});