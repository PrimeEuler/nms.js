var radius = require('radius');
var dgram = require('dgram');
var util = require('util');
var events = require("events");
function radiusClient(options){
    options = options||{};
    events.EventEmitter.call(this);
    var _self = this;
    this.secret = options.secret||'radius_secret';
    this.client = dgram.createSocket("udp4");
    this.client.bind();
    this.sent_packets={};
    this.callbacks=[];
    this.client.on('message', function (msg, rinfo) {
        var response = radius.decode({ packet: msg, secret: _self.secret });
        var request = _self.sent_packets[response.identifier];
        var valid_response = radius.verify_response({
            response: msg,
            request: request.raw_packet,
            secret: request.secret
        });
        if (valid_response) {
            //console.log('Got valid response ' + response.code + ' for packet id ' + response.identifier);
            var snt_pkt = radius.decode({
                packet: _self.sent_packets[response.identifier].raw_packet,
                secret: _self.secret
            });
            var resp = {
                uuid: request.uuid, 
                user: snt_pkt.attributes['User-Name'] ,
                code: response.code
            }
            _self.callbacks[response.identifier](resp)
            
        } else {
            //console.log('WARNING: Got invalid response ' + response.code + ' for packet id ' + response.identifier);
        }
    });
    this["Access-Request"] = function (authRequest, callback) {

            var packet = {
                code: "Access-Request",
                secret: _self.secret,
                identifier: Math.floor(Math.random() * 255),
                attributes: [
                    ['NAS-IP-Address', '127.0.0.1'],
                    ['User-Name', authRequest.user],
                    ['User-Password', authRequest.pass]
                ]
            };
            _self.callbacks[packet.identifier] = callback;
            var encoded = radius.encode(packet);
            _self.sent_packets[packet.identifier] = {
                raw_packet: encoded,
                secret: packet.secret,
                uuid: authRequest.uuid
            };
            _self.client.send(encoded, 0, encoded.length, authRequest.server.port, authRequest.server.address);
    }
    
}
util.inherits(radiusClient, events.EventEmitter);
module.exports = radiusClient;