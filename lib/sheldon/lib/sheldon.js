var util    = require('util'),
    path    = require('path'),
    os      = require("os"),
    _       = require('lodash'),
    lineman = require(__dirname + '/lineman.js'),
    uuid    = require(__dirname + '/uuid.js'),
    parse   = require('minimist')
function sheldon(STDIN,STDOUT){
            var STRIP_COMMENTS  = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
            var ARGUMENT_NAMES  = /([^\s,]+)/g;
            var WORDS           = /"[^"]*"|[^\s"]+/g;
            function getParamNames(func) {
              var fnStr = func.toString().replace(STRIP_COMMENTS, '');
              var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
              if(result === null)
                 result = [];
              return result;
            }
            function getKeys(varBind,oid){
                if(typeof varBind != 'object' || varBind === null)return[];
                var canidates = [];
                function startsWith(value){
                    return value.indexOf(oid)===0;
                }
                try{
                    canidates = Object.keys(varBind).filter(startsWith);
                }catch(e){
                    console.log(e)
                }
                return canidates;
                
            }
            function longestInCommon(candidates, index) {
                var i, ch, memo
                do {
                    memo = null
                    for (i = 0; i < candidates.length; i++) {
                        ch = candidates[i].charAt(index)
                        if (!ch) break
                        if (!memo) memo = ch
                        else if (ch != memo) break
                    }
                } while (i == candidates.length && ++index)

                return candidates[0].slice(0, index)
            }
            function getArgs(line){
                var phrases = line.match(WORDS)||[];
                return parse(phrases);
            }
            var shell = this;
            var vty = new lineman( { input:STDIN, output:STDOUT||STDIN } );
            
            vty.on('keypress',function(ch,key){
                var access = vty.state.access.code==="Access-Accept"
                if(!access)return;
                key = key||{};
                switch(key.name){
                    case 'tab':
                        shell.cli.tabComplete();
                        break;
                    default:
                    break;
                }
            });
            vty.on('line',function(line){
                var access = vty.state.access.code==="Access-Accept"
                if(line.length===0 && access)return;
                var args    = getArgs(line);
                var val     = args._.shift();
                var varBind = access
                        ? _.get( shell.context , val) 
                        : vty.access;
                shell.cli._eval(varBind, args, line);
            })

            shell._ = _;
            shell.cli = {
                parameters: {
                    silent:['password'],
                    optional:['port'],
                    object:['callback']
                },
                inspect:    function (varBind){
                    if(vty.ended)return;
                    vty.open();
                    var expression =  util.inspect( varBind ,false, 10, true);
                    vty.stdout.write('\r\n' +  expression + '\r\n')
                },
                _completer: function(){
                    var words       = (vty.buffer.match(WORDS)||[])
                    var path        = words.shift()
                    var hops        = (typeof path === 'string')?path.split('.',-1):[];
                    var hop         = -1;
                        path        = hops.join('.');
                        nextHops    = [];
                    var context     = shell.context;
                    var found       = false;
                    var isHop       = false;
                    var isLast      = false;
                    while(nextHops.length === 0 && hop < hops.length){
                            hop++;
                            nextHops = getKeys(context, hops[hop])
                            isHop = nextHops.indexOf(hops[hop])>-1;
                            isLast = (hop < hops.length-1);
                            if (nextHops.length > 1 ){
                                var subString = longestInCommon(nextHops, hops[hop].length);
                                hops[hop] = subString
                                path = hops.join('.');
                                found = true;
                            }
                            if (nextHops.length > 1 && isHop && isLast){
                                nextHops = [hops[hop]];
                            }
                            if (nextHops.length === 1){
                                    hops[hop] = nextHops.shift();
                                    path = hops.slice(0, hop+1).join('.');
                                    context = _.get(context, hops[hop]);
                                    found = true
                            }
                            if(found){
                                vty.buffer = '';
                                vty.offset = 0;
                                vty.append(path);
                                if(nextHops.length > 1){
                                  //vty.stdout.write('\r\n')
                                  shell.cli.inspect(nextHops)
                                }
                            }
                    }
                    if(!found){
                            try{
                                nextHops = Object.keys(context)
                                shell.cli.inspect(nextHops)
                            }catch(e){
                                console.log(e)
                            }
                        }
                    
                },
                tabComplete:function(){
                        //GET WORDS
                        var words       = (vty.buffer.match(WORDS)||[])
                        //could index for back tracking
                        //READ AND REMOVE FIRST WORD
                        var word         = words.shift()
                        //FIRST WORD IS PATH OR HOP ARRAY
                        var path        = (typeof word === 'string')?word.split('.',-1):[];
                        //HOP INDEX
                        var hop         = -1;
                        
                        var namespace   = path.join('.');
                        
                        var canidates   = [];
                        var context     = shell.context;
                        var found       = false;
                        var isHop       = false;
                        var isLast      = false;
                        
                        while(canidates.length === 0 && hop < path.length){
                            hop++;
                            canidates = getKeys(context, path[hop])
                            isHop = canidates.indexOf(path[hop])>-1;
                            isLast = (hop < path.length-1);
                            if (canidates.length > 1 ){
                                var subString = longestInCommon(canidates, path[hop].length);
                                path[hop] = subString
                                namespace = path.join('.');
                                found = true;
                            }
                            if (canidates.length > 1 && isHop && isLast){
                                canidates = [path[hop]];
                            }
                            if (canidates.length === 1){
                                    path[hop] = canidates.shift();
                                    namespace = path.slice(0, hop+1).join('.');
                                    context = _.get(context, path[hop]);
                                    found = true
                            }
                            if(found){
                                vty.buffer = '';
                                vty.offset = 0;
                                vty.append(namespace);
                                if(canidates.length > 1){
                                  //vty.stdout.write('\r\n')
                                  shell.cli.inspect(canidates)
                                }
                            }
                        }
                        if(!found){
                            try{
                                canidates = Object.keys(context)
                                //vty.stdout.write('\r\n')
                                shell.cli.inspect(canidates)
                            }catch(e){
                                console.log(e)
                            }
                        }
                },
                apply:      function (_function, _object){
                    var params = [];
                    var result = null
                    for(var key in _object) {
                        params.push(_object[key]) ;
                    }
                    try{
                        result = _function.apply(null,params);
                        shell.cli._eval(result)
                    }catch(error){
                        shell.cli._eval(error)
                    }
                },
                call:       function(varBind,args,line){
                    var parameters = {};
                    var index = -1;
                    vty.state.echo = true;
                    getParamNames(varBind).forEach( function(param){
                        index++;
                        var optional = shell.cli.parameters.optional.indexOf(param)>-1;
                        var silent = shell.cli.parameters.silent.indexOf(param)===-1;
                        
                        parameters[param] = silent;
                        //fill by index
                        if(args._[index]){
                            parameters[param] = args._[index];
                        }else if(optional){
                            delete(parameters[param])
                        }
                        //fill by name
                        if(typeof args[param] != 'undefined'){
                            parameters[param] = args[param];
                        }
                        
                    })
                    function _call(params){
                        var _line = '';
                        
                        for(var key in params) {
                            _line+='--' + key + ' ' + params[key] + ' '
                        }
                        params = getArgs(_line)
                        delete(params._)
                        //assign object
                        
                        for(key in params) {
                            if(shell.cli.parameters.object.indexOf(key)>-1){
                                params[key] = _.get(shell, params[key])
                            }
                        }
                        
                        
                        shell.cli.apply(varBind,params);
                    }
                    //prompt for udefined but required parameters
                    vty.promptFor(parameters,_call);
                },
                _eval:      function (varBind, args, line){
                    switch(typeof varBind){
                        case 'object':
                            shell.cli.inspect(varBind)
                            break;
                        case 'symbol':
                            break;
                        case 'function':
                            shell.cli.call(varBind, args, line)
                            break;
                        case 'undefined':
                        case 'boolean':
                        case 'number':   
                        case 'string':
                        default:
                            vty.stdout.write('\r\n' +  varBind + '\r\n' );
                            break;
    
                    }
            },
                prompt:function(){
                    var access = vty.state.access.code==="Access-Accept"
                    if(access){
                         vty.prompt()
                    }else{
                         shell.cli._eval(vty.access,{_:[]},'')
                    }
                }
            }
            vty.connect();
            
            vty.state.context.value = os.hostname();
            vty.state.prompt.value = '#';
            vty.open();
            shell.vty = vty;
            shell.context = {
                os:os,
                require:function(path){
                    shell.context[path] = require(path)
                },
                terminal:{
                    width:function(columns){
                        vty.stdout.columns = !Number.isNaN(parseInt(columns))
                        ? parseInt(columns) 
                        : vty.stdout.columns;
                        vty.resize();
                        return vty.stdout.columns
                    },
                    length:function(rows){
                        vty.stdout.rows = !Number.isNaN(parseInt(rows))
                        ? parseInt(rows) 
                        : vty.stdout.rows;
                        vty.resize();
                        return vty.stdout.rows
                        
                    }
                },
                exit:   function(){
                        vty.end();
                    }
            }
}
module.exports = sheldon;