var radius = require('radius');
var dgram = require("dgram");

function radiusServer(options){
    options = options||{};
    var server      = dgram.createSocket("udp4");
    server.secret   = options.secret||'radius_secret';
    server.on("message", function (msg, rinfo) {
        var code, username, password, packet;
        try{
    	packet = radius.decode({ packet: msg, secret: server.secret });
        }
        catch(e){
            console.log(e);
            return;
        };
        server.emit('packet', packet)
    	if (packet.code != 'Access-Request') {
    		console.log('unknown packet type: ', packet.code);
    		return;
    	}
    
    	username = packet.attributes['User-Name'];
    	password = packet.attributes['User-Password'];
    
    	//console.log('Access-Request for ' + username);
    
    	if (username == 'jebert' && password == 'test123') {
    		code = 'Access-Accept';
    	} else if (username == 'guest' && password == 'test13') {
    		code = 'Access-Accept';
    	} else {
    		code = 'Access-Reject';
    	}
    
    	var response = radius.encode_response({
    		packet: packet,
    		code: code,
    		secret: server.secret
    	});
    
    	//console.log('Sending ' + code + ' for user ' + username + ' to ', rinfo.address, rinfo.port);
    	server.send(response, 0, response.length, rinfo.port, rinfo.address, function (err, bytes) {
    		if (err) {
    			console.log('Error sending response to ', rinfo);
    		}
    	});
    });
    

    return server
}
module.exports = radiusServer;