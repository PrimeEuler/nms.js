
var fs = require('fs');
var express = require('express');
var io = require('socket.io');
var stream = require('socket.io-stream');
var crypto = require('crypto');
var EventEmitter = require("events");
var util = require('util');
var terminal = require('term.js');

util.inherits(shellServer, EventEmitter);
function shellServer(){
    EventEmitter.call(this);
    var self = this;
    var app = express();
    app.use(express.static(__dirname + '/client'));
    app.use(terminal.middleware());
    app.get('/', function (req, res) {
		res.sendFile(__dirname + '/shellClient.html');
	});
    this.server = require('https').createServer({
        key: fs.readFileSync(__dirname +'/ssl/ca.key'),
        cert: fs.readFileSync(__dirname +'/ssl/ca.crt'),
        passphrase: 'password'
    }, app);
    io(this.server).on('connection', function (socket) {
        self.emit('connection',  stream(socket) )
    });
    self.createStream = stream.createStream;
}
shellServer.prototype.listen = function(options){
    options.port  = options.port || 8443;
    this.server.listen(options.port, function(){
        console.log('Server listening at port %d', options.port);
        
    });
}
module.exports = shellServer;