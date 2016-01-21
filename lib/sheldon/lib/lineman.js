var ansiEncoder = require(__dirname  + '/ansiEncoder.js'),
    uuid     = require(__dirname + '/uuid.js'),
    util = require('util'),
    inherits = util.inherits,
    keypress = require('keypress'),
    Readable = require('stream').Readable,
    Writeable = require('stream').Writeable,
    EventEmitter = require('events');
Array.prototype.peek = function(){
    return this[this.length -1]
}
String.prototype.splice = function (idx, rem, s) {
    return (this.slice(0, idx) + s + this.slice(idx + Math.abs(rem)));
};
String.prototype.del = function (idx) {
    return (this.slice(0, idx - 1) + this.slice(idx));
};
inherits(lineman, EventEmitter);
function lineman(options){
    var rl = this;
    rl.id = options.input.id || uuid();
    EventEmitter.call(this);
    //STATE
    rl.state = {
        connected:false,
        open:false,
        echo:true, 
        query:false, 
        callback:null,
        buffer:{
            color:'cyan'
        },
        context:{
            color:'green',
            value:'rl'
        },
        prompt:{
            color:'magenta',
            value:'>'
            
        },
        access:{
            uuid: rl.id,
            user:'',
            code:'Access-Request',
            rejects:0
        }
        
    }
    rl.access = function(username,password){
        rl.state.access.user = username;
        rl.state.access.code = (username==='nms' && password==='test')
                                ?"Access-Accept"
                                :"Access-Reject";
                                
        if(rl.state.access.code!="Access-Accept"){
            rl.state.access.rejects++;
        }
        if(rl.state.access.rejects >=3){
            rl.end();
        }
        return rl.state.access
                
    }
    rl.echo = { question:false, tab:false}
    rl.closed = true;
    rl.ended = false;
    rl.mousemode = true;
    //BUFFER
    rl.buffer   = '';
    rl.offset   = 0;
    rl.history  = [];
    rl.index    = 0;
    //STREAM
    rl.stdin            = options.input;
    //rl.stdin =new Readable();
    rl.stdin.setEncoding('utf8');
    rl.stdin.chunkPaste = true;//emit pasted input - keyperss s.length edit line:
    rl.stdin.on('readable',function(){
          if(rl.stdin.isPaused()){
              rl.stdin.resume();
              //rl.stdout.uncork();
          }
    })
    rl._setRawMode  = function(mode){
        if(typeof rl.stdin.setRawMode === 'function'){
            return rl.stdin.setRawMode(mode)
        }else{
            rl.stdin.isRaw      = true;
            rl.stdin.setRawMode = function(value) {
              rl.stdin.isRaw = !!value;
            };
        }
    }
    rl.stdout       = options.output;
    if(!rl.stdout.isTTY){
        rl.stdout.isTTY     = true;
        rl.stdout.columns   = 80;
        rl.stdout.rows      = 24;
    }
    //TODO:
    //      set cursor to {row:999, column:999}
    //      query actual position to determine terminal dimensions
    //
    //FIX FOR LATENCY ISSUE readline2._prompt buffers ansi encoding;
    //possibly caused by flow controls
    //socket.io.stream
    //rl.cursor = ansi(rl.stdout);
    //
    //TTY writeStream
    rl.cursor = new ansiEncoder();
    //TTY KEY LISTENERS
    rl.keys   = {
        up : function(){
            rl.buffer = rl.history[ rl.history.length - 1 - rl.index ]
            rl.buffer = rl.buffer ? rl.buffer : '';
            rl.offset = rl.buffer.length;
            if(rl.index < rl.history.length - 1 ){ rl.index ++; }
        },
        down : function(){
            if( rl.index>0 ){
                rl.index--;
                rl.buffer = rl.history[  rl.history.length - 1 - rl.index ]
                rl.buffer = rl.buffer ? rl.buffer : '';
                rl.offset = rl.buffer.length;
            }
        },
        right : function(){
            if( rl.offset < rl.buffer.length ){
                rl.offset++;
            }
        },
        left : function(){
            if ( rl.offset > 0) {
                rl.offset--;
            }
        },
        delete : function(){
            if (rl.buffer.length > 0 && rl.offset >= 0) {
                rl.buffer = rl.buffer.del( rl.offset + 1 );
            }
        },
        backspace : function(){
            if (rl.buffer.length > 0 && rl.offset > 0) {
                rl.buffer = rl.buffer.del(rl.offset);
                rl.offset--;
            }
        },
        b: function(ch, key){
            if(key.ctrl){
                rl.mouseMode = !rl.mouseMode;
                if(rl.mouseMode){
                    keypress.enableMouse(rl.stdout);
                }else
                {
                    keypress.disableMouse(rl.stdout);
                }
            }else{
                rl.append( ch )
            }
        },
        m: function(ch, key){
            if(key.ctrl){
                rl.line();
            }else{
                rl.append( ch )
            }
        },
        tab : function(){
            rl.echo.tab? rl.append( ch ):null;
        },
        question : function(ch,key){
            rl.echo.question? rl.append( ch ):null;
        },
        return : function(){
            rl.line();
        }
    }
    //EVENTS
    rl.keypress = function(ch,key){
        //console.log('open:',rl.state.open)
        if (!rl.state.open) return
        rl.emit('keypress',ch,key)
        if(ch==='?'){ key = {name:'question'};}
        if( key ){ 
           rl.keys[key.name]? 
           rl.keys[key.name]( ch, key ):
           rl.append( key.sequence ) 
        }else if ( ch ){ 
            rl.append( ch ) 
        }
        
        if(rl.state.echo)rl.prompt()  
    }
    rl.mousepress = function(info){
        console.log(info)
    }
    rl.resize = function(){
        var rows = rl.stdout.rows;
        var columns = rl.stdout.columns;
        //console.log(rows, columns)
        console.log('\r\nresize ' + rows + 'x' + columns)
        rl.stdout.emit('socket.io',{
            event:'resize',
            data:{
                rows:rows,
                cols:columns
            }
        }
        )
        
    }
    //

    rl.close = rl.close.bind(this)
    rl.open = rl.open.bind(this)
    rl.attach = rl.attach.bind(this)
    rl.prompt = rl.prompt.bind(this)
    rl.end = rl.end.bind(this)
    rl.once('connect',function(){
        //console.log('rl.connect')
        if (rl.state.connected) return;
        rl.state.connected = true;
        rl._setRawMode(true)
        keypress(rl.stdin);
        rl.stdin.addListener('keypress', rl.keypress)
        rl.stdin.addListener('mousepress',rl.mousepress)
        rl.stdin.addListener('end', rl.close );
        rl.stdout.addListener('finish', rl.end); 
        rl.stdout.addListener('resize', rl.resize);
    })
    rl.once('end',function(){
        //console.log('rl.end')
        rl.state.connected = false;
        rl.state.open = false;
        rl.stdin.removeListener('keypress', rl.keypress)
        rl.stdin.removeListener('mousepress',rl.mousepress)
        rl.stdin.removeListener('end',rl.close);
        rl.stdout.removeListener('resize', rl.resize);
        rl._setRawMode(false)
        if(process.stdout === rl.stdout){
            process.exit()
        }else{
            rl.stdout.end();
        }
    })

}
lineman.prototype.end= function() {
  var rl = this
    rl.ended = true;
    rl.emit('end');
    
};
lineman.prototype.close= function() {
  var rl = this
  console.log('open:',rl.state.open)
  if (!rl.state.open) return;
  rl.state.open = false;
};
lineman.prototype.open = function() {
  var rl = this
  //console.log('open:',rl.state.open)
  if (rl.state.open) return;
  rl.state.open = true;
  rl.prompt()
};
lineman.prototype.attach = function(connection,error){
            var self = this
            if(error){  throw error; }
            
            connection.stdin.pipe(self.stdout,{ end : false } );
            self.stdin.pipe(connection.stdout).on('end', self.open)
                //.setEncoding('utf8');
                self.close();
}
lineman.prototype.connect = function() {
  var rl = this
  rl.emit('connect');
};
lineman.prototype.append = function(char){
    var rl = this;
    rl.buffer = rl.buffer.splice(rl.offset, 0, char);
    rl.offset += char.length;
    return this;
};
lineman.prototype.line = function (){
    var rl = this;
    var line = rl.buffer;
    
    //clear buffer
    rl.index = 0;
    rl.buffer = '';
    rl.offset = 0;

    if(rl.state.echo){
        //save line to history
        var pos = rl.history.indexOf(line);
        pos > -1 && rl.history.splice(pos, 1);
        rl.history.push(line);
    }
    //emit line or return line to query callback
    if(rl.state.query===true){
        rl.state.query=false;
        rl.state.echo=true;
        var cb = rl.state.callback;
        rl.state.callback=null;
        cb(line)
    }else{
        if(line.length===0) rl.stdout.write('\r\n');
        rl.emit('line',line);
    }
    
    return this;

};
lineman.prototype.prompt = function(){
        var rl = this;
        if(!rl.state.open)return
        if(rl.ended)return
        var prompt  = rl.state.prompt;
        var context = rl.state.context;
        var buffer  = rl.state.buffer;
        rl.cursor
            .erase('line')                                       //clear line contest
            .defaults( )                                         //reset colors
            //.append('\r') 
            .horizontalAbsolute()//set cursor at col 0
            .foreground( context.color  ).append( context.value )//Defualt:os.hostname
            .foreground( prompt.color   ).append( prompt.value  )//Defualt:#
            .foreground( buffer.color   ).append( rl.buffer     )//line buffer
            .left( rl.buffer.length - rl.offset )                //set cursor
            //todo .position(row,col)                            //screen buffer
            .defaults( );                                        //reset colors
            
            
        rl.stdout.write( rl.cursor.flush() )    
};
lineman.prototype.question = function(query, callback){
    var rl = this;
    rl.state.query = true;
    rl.state.callback = callback; 
    rl.state._context = rl.state.context;
    rl.state._prompt = rl.state.prompt;
    rl.state.context.value = query;
    rl.state.prompt.value = ':';
    rl.prompt();
};
lineman.prototype.promptFor = function(schema, callback){
    var rl = this;
    var keys = (typeof schema==='object')? Object.keys( schema ): schema;
    var i = 0;
    var _context = rl.state.context.value;
    var _prompt = rl.state.prompt.value;
    ask();
    function ask(){
        rl.state.echo = true;
        if(typeof schema==='object'){
            if(schema[keys[i]]===null){return;}
            if(typeof schema[keys[i]] === 'boolean'){
                rl.state.echo = schema[keys[i]]
                rl.state.query = true;
                
                rl.stdout.write('\r\n');
                rl.state.context.value = keys[i];
                rl.state.prompt.value = ':';
                rl.prompt();

                rl.state.callback = function(response){
                    if(response.length===0){
                        response = undefined;
                    }
                    schema[keys[i]] = response;
                    i++;
                    
                    if(i<keys.length){
                        ask()
                    }else{
                        rl.state.context.value = _context;
                        rl.state.prompt.value = _prompt;
                        callback(schema)
                    }
                }; 
            }else{
                i++;
                if(i<keys.length){
                    ask()
                }else{
                    rl.state.context.value = _context;
                    rl.state.prompt.value = _prompt;
                    callback(schema)
                }
            }
        }else{
            
        }


    }
};
lineman.prototype.wait = function(bool){
    var rl = this;
    var spinner = ['\\','|','/','~'];
    var i =0  ;
    rl.state.spin = bool;
    if(rl.state.spin){
        setTimeout(spin, 500);
    }
    function spin(){
        rl.cursor
            .left( 1)
            .foreground('red')
            .append(spinner[i])
            .defaults( );
        rl.stdout.write( rl.cursor.flush() )  
        if(i<spinner.length-1){
            i++;
        }else{
            i=0;
        }
        if(rl.state.spin){
            rl.stdin.pause();
            setTimeout(spin, 100);
        }else{
            rl.stdin.resume();
            rl.prompt();
        }
    }

}


module.exports = lineman;