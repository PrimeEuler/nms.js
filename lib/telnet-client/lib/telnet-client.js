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
            stdin.setEncoding('utf8');
            var serverNawsOk = false;
            var sendWindowSize = function() {
                var nawsBuffer = new Buffer(4);
                nawsBuffer.writeInt16BE(stdout.columns, 0);
                nawsBuffer.writeInt16BE(stdout.rows, 2);
                stdout.writeSub(options.indexOf('windowSize'), nawsBuffer);
            };
            stdin.on('command', function(command) {
                // Received: IAC <command> - See RFC 854
                console.log('telnet command event',command)
                stdout.writeCommand(command);
            });
            stdin.on('sub',     function(option, buffer) {
                // Received: IAC SB <option> <buffer> IAC SE - See RFC 855
                console.log('telnet sub event',options[option], buffer)
                stdout.writeSub(option, buffer)
            });
            stdin.on('do',      function(option) {
                console.log('telnet do',options[option])
                switch(options[option]){
                    case 'windowSize':
                        serverNawsOk = true;
                        stdout.writeWill(option);
                        sendWindowSize();
                        console.log('telnet will',options[option])
                        break;
                    default:
                        stdout.writeWont(option);
                        console.log('telnet wont',options[option])
                    break;
                }
                
            });
            stdin.on('dont',    function(option) {
                console.log('telnet dont',options[option],'wont')
                stdout.writeWont(option);
            });
            stdin.on('will',    function(option) {
                    console.log('telnet will',options[option])
                switch(options[option]){
                    case 'echo':
                        stdout.writeDo(option);
                        console.log('telnet do',options[option])
                        break;
                    case 'suppressGoAhead':
                        stdout.writeDo(option);
                        console.log('telnet do',options[option])
                        break;
                    default:
                        stdout.writeDont(option);
                        console.log('telnet dont',options[option])
                    break;
                }
                
            });
            stdin.on('wont',    function(option) {
                // Received: IAC WONT <option> - See RFC 854
                console.log('telnet wont',option[option],'dont')
                stdout.writeDont(option)
            });
            this.stdin = stdin;
            this.stdout = stdout;
            
}
module.exports = telnet;
