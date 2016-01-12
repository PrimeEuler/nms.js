 var net = require('net'),
    nms = require('../'),
    telnetStream    = require('../lib/telnet-client');

var serverSocket = net.createServer(function(connection) {

        var telnet = new telnetStream();  
        
        
        connection.pipe(telnet.rx)
        telnet.tx.pipe(connection)
        
        var NMS = new nms(telnet.rx, telnet.tx)

        telnet.tx.writeDo(telnet.options.indexOf('windowSize'));
});

serverSocket.listen(9999,function(){
    console.log('listening on ', 9999)
});
