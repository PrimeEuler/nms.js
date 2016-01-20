var telnetIN = require('telnet-stream').TelnetInput,
    telnetOUT = require('telnet-stream').TelnetOutput

function telnet(){
            var options = [];
            options[0] = "transmitBinary";
            options[1] = "echo";
            options[2] = "reconnection";
            options[3] = "suppressGoAhead";
            options[4] = "approxMessageSizeNegotiation";
            options[5] = "status";
            options[6] = "timingMark";
            options[7] = "remoteControlledTransandEcho";
            options[8] = "outputLineWidth";
            options[9] = "outputPageSize";
            options[10] = "outputCarriageReturnDisposition";
            options[23] = "sendLocation";
            options[24] = "terminalType";
            options[31] = "windowSize";
            options[32] = "terminalSpeed";
            options[33] = "remoteFlowControl";
            options[34] = "linemode";
            options[35] = "displayLocation";
            options[36] = "environmentVariables";
            options[39] = "environmentOption";
            var stdin = new telnetIN();
            var stdout = new telnetOUT();
            stdout.columns = 80;
            stdout.rows = 24;
            //stdin.setEncoding('utf8');
            var serverNawsOk = false;
            var sendWindowSize = function() {
                var nawsBuffer = new Buffer(4);
                nawsBuffer.writeInt16BE(stdout.columns, 0);
                nawsBuffer.writeInt16BE(stdout.rows, 2);
                stdout.writeSub(options.indexOf('windowSize'), nawsBuffer);
                console.log( 'telnet.tx sub windowSize '  + stdout.columns + 'x' + stdout.rows);
            };
            stdin.on('command', function(command) {
                // Received: IAC <command> - See RFC 854
                console.log('telnet.rx command ',command)
                stdout.writeCommand(command);
            });
            stdin.on('sub',     function(option, buffer) {
                // Received: IAC SB <option> <buffer> IAC SE - See RFC 855
                console.log('telnet.rx sub ',options[option])
                //stdout.writeSub(option, buffer)
                if(options[option] === "windowSize") {
                    var width = buffer.readInt16BE(0);
                    var height = buffer.readInt16BE(2);
                    console.log( 'Client window: ' + width + 'x' + height);
                    stdout.columns = width;
                    stdout.rows = height;
                    stdout.emit('resize',{cols:width,rows:height});
                }
            });
            stdin.on('do',      function(option) {
                console.log('telnet.rx do',options[option])
                switch(options[option]){
                    case 'windowSize':
                        serverNawsOk = true;
                        stdout.writeWill(option);
                        sendWindowSize();
                        console.log('telnet.tx will',options[option])
                        break;
                    case 'suppressGoAhead':
                        stdout.writeWill(option);
                        console.log('telnet.tx will',options[option])
                        break;
                    case 'echo':
                        stdout.writeWill(option);
                        console.log('telnet.tx will',options[option])
                        break;
                    default:
                        stdout.writeWont(option);
                        console.log('telnet.tx wont',options[option])
                    break;
                }
                
            });
            stdin.on('dont',    function(option) {
                console.log('telnet.rx dont',options[option])
                //stdout.writeWont(option);
                //console.log('telnet.out wont',options[option])
            });
            stdin.on('will',    function(option) {
                    console.log('telnet.rx will',options[option])
            });
            stdin.on('wont',    function(option) {
                console.log('telnet.rx wont',options[option])
                stdout.writeWill(option)
            });
            this.rx = stdin;
            this.options = options
            this.tx = stdout;
            
}
module.exports = telnet;
