var Transform = require("stream").Transform;
var util = require('util');

util.inherits(ansiEncoder, Transform);
function ansiEncoder(){
    Transform.call(this, { "objectMode": true });
}
ansiEncoder.prototype.buffer = '';
ansiEncoder.prototype.append = function(packet){
    this.buffer+=packet;
    return this;
}
ansiEncoder.prototype._transform = function(packet,encoding,callback){
    //console.log(this.buffer)
    this.push(this.buffer + packet);
    this.buffer = '';
    callback()
}
ansiEncoder.prototype.enableMouse = function(){
    this.push('\x1b[?1000l');
    return this;
}
ansiEncoder.prototype.disableMouse = function(){
    this.push('\x1b[?1000h');
    return this;
}
ansiEncoder.prototype.flush = function(){
    var buff = this.buffer;
    this.buffer = '';
    return  buff; 
    
}
ansiEncoder.prototype.code = function(code ){
	return (this.append('\x1b' + code));
}
ansiEncoder.prototype.toString= function () {
	var buf = '';
	//this.stream.replace(/\n/g, '\r\n').replace(/\\n/g, '\r\n');
	buf += this.buffer;
	this.buffer = '';
	return (buf)
}
ansiEncoder.prototype.defaults= function () {
	return (this.append('\x1b[0m'));
}
ansiEncoder.prototype.reset= function () {
	return (this.append('\x1bc'));
}
ansiEncoder.prototype.up= function (n) {
	if (n === undefined) n = 1;
	return (this.append('\x1b[' + Math.floor(n) + 'A'));
}
ansiEncoder.prototype.down= function (n) {
	if (n === undefined) n = 1;
	return (this.append('\x1b[' + Math.floor(n) + 'B'));
}
ansiEncoder.prototype.left= function (n) {
	if (n === undefined) n = 1;
	n > 0 ? this.append('\x1b[' + Math.floor(n) + 'D') : '';
	return (this);
}
ansiEncoder.prototype.right= function (n) {
	if (n === undefined) n = 1;
	n > 0 ? this.append('\x1b[' + Math.floor(n) + 'C') : '';
	return (this);
}
ansiEncoder.prototype.position= function (row, column) {
	this.append('\x1b[' + Math.floor(row) + ';' + Math.floor(column) + 'f');
	return (this);
}
ansiEncoder.prototype.horizontalAbsolute = function(){
    this.append('\x1b[G');
	return (this);
}
ansiEncoder.prototype.query_cursor= function () {
	this.push('\x1b[6n');
	return (this);
}
ansiEncoder.prototype.save_cursor= function () {
    			this.push('\x1b7');
    			return (this);
    		}
ansiEncoder.prototype.position_r= function(row, column){
    		    //EscLine;ColumnR	Response: cursor is at v,h
    		    this.append('\x1b[' + Math.floor(column) + ';' + Math.floor(row) + 'r');
    			return (this);
    		}
ansiEncoder.prototype.restore_cursor= function () {
    			this.push('\x1b8');
    			return (this);
    		}
ansiEncoder.prototype.escape= function (buf) {
    			var self = this;
    			var codes = buf.toString().split(/\x1b/);
    			codes.shift();
    			codes.forEach(function (code) {
    				var CTRL = code;
    				if (CTRL.indexOf('[') == 0 && CTRL.indexOf('R') > 3) {
    					var pos = CTRL
                                    .slice(2, -1)
                                    .split(';')
                                    .map(Number);
    					self.cursor.row = pos[0];
    					self.cursor.column = pos[1];
    				}
    			});
    		}
ansiEncoder.prototype.erase= function (s) {
    			if (s === 'end' || s === '$') {
    				this.append('\x1b[K');
    			}
    			else if (s === 'start' || s === '^') {
    				tthis.append('\x1b[K');
    			}
    			else if (s === 'line') {
    				this.append('\x1b[2K');
    			}
    			else if (s === 'down') {
    				this.append('\x1b[J');
    			}
    			else if (s === 'up') {
    				this.append('\x1b[1J');
    			}
    			else if (s === 'screen') {
    				this.append('\x1b[1J');
    			}
    			return (this);
    		}
ansiEncoder.prototype.move= function (x, y) {
    			var bufs = [];
    			if (y < 0) this.up(-y)
    			else if (y > 0) this.down(y)
    			if (x > 0) this.right(x)
    			else if (x < 0) this.left(-x)
    			return this;
    		}
ansiEncoder.prototype.foreground= function (color) {
    			if (typeof color === 'number') {
    				if (color < 0 || color >= 256) {
    					//this.emit('error', new Error('Color out of range: ' + color));
    				}
    				this.append('\x1b[38;5;' + color + 'm');
    			}
    			else {
    				var c = {
    					black: 30,
    					red: 31,
    					green: 32,
    					yellow: 33,
    					blue: 34,
    					magenta: 35,
    					cyan: 36,
    					white: 37
    				}[color.toLowerCase()];
    
    				//if (!c) this.emit('error', new Error('Unknown color: ' + color));
    				this.append('\x1b[' + c + 'm');
    			}
    			return (this);
    		}
ansiEncoder.prototype.background= function (color) {
    			if (typeof color === 'number') {
    				if (color < 0 || color >= 256) {
    					//this.emit('error', new Error('Color out of range: ' + color));
    				}
    				this.append('\x1b[48;5;' + color + 'm');
    			}
    			else {
    				var c = {
    					black: 40,
    					red: 41,
    					green: 42,
    					yellow: 43,
    					blue: 44,
    					magenta: 45,
    					cyan: 46,
    					white: 47
    				}[color.toLowerCase()];
    
    				//if (!c) this.emit('error', new Error('Unknown color: ' + color));
    				this.append('\x1b[' + c + 'm');
    			}
    			return this;
    		}
module.exports = ansiEncoder;