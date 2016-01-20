require('date-utils')
var dgram = require('dgram');
var server = dgram.createSocket("udp4");
var winston = require('winston');
var fs = require('fs');
var express = require('express.io');
//var bone = require('bone.io');
var SSL_options = {
    key: fs.readFileSync(__dirname + '/ssl/ca.key'),
    cert: fs.readFileSync(__dirname + '/ssl/ca.crt'),
    passphrase: 'password'
}
var app = express().https(SSL_options).io()


app.io.configure(function (){
  app.io.set('authorization', function (handshakeData, callback) {
    callback(null, true); // error first callback style 
  });
});
//var app = express().http().io();

//bone.set('io.options', { server: app.io })
//app.use(bone.static());
app.use(express.cookieParser());
app.use(express.session({ secret: 'syslogd514' }));
app.use(express.static(__dirname));
app.listen(8514);

app.get('/', function (req, res) {
    req.session.loginDate = new Date().toString();
    res.sendfile(__dirname + '/syslogd.htm');
})
app.io.route('join', function (req) {
    req.io.join('syslogd')
});

String.prototype.trimString = function () {
    return this.replace(/\s+/, " ");
}
String.prototype.removeDblWhitespace = function () {
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

var parse = function (message, rinfo, callback) {

    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
    };

    function guid() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
    }

    var severity = [
   "Emergency"
  , "Alert"
  , "Critical"
  , "Error"
  , "Warning"
  , "Notice"
  , "Informational"
  , "Debug"
];

    var facility = [
    "kernel messages"
  , "user-level messages"
  , "mail system"
  , "system daemons"
  , "security/authorization messages"
  , "messages generated internally by syslogd"
  , "line printer subsystem"
  , "network news subsystem"
  , "UUCP subsystem"
  , "clock daemon"
  , "security/authorization messages"
  , "FTP daemon"
  , "NTP subsystem"
  , "Log audit"
  , "Log alert"
  , "Clock daemon"
  , "Local0"
  , "Local1"
  , "Local2"
  , "Local3"
  , "Local4"
  , "Local5"
  , "Local6"
  , "Local7"
];
    var result = {
    "id": guid()
    ,"original": message
    , "ipv46": "N/A"
    , "date": "N/A"
    , "time": "N/A"
    , "pri": -1
    , "facility_id": -1
    , "facility": "N/A"
    , "severity_id": -1
    , "severity": "N/A"
    , "host": "N/A"
    , "pid": ""
    , "content": ""
    , "rawcontent": ""
    };
    if (rinfo != undefined) { result.ipv46 = rinfo.family; }
    var date;
    var string_date;
    var SOF = -1, EOF = -1;
    SOF = message.indexOf('<');
    if (SOF > -1) {
        EOF = message.indexOf('>', SOF);
        if (EOF > -1) {
            result.pri = parseInt(message.substring(SOF + 1, EOF));
            result.severity_id = result.pri % 8;
            result.facility_id = (result.pri - result.severity_id) / 8;
            result.facility = facility[result.facility_id];
            result.severity = severity[result.severity_id];
            result.host = rinfo.address;


            msg = message.substr(EOF + 1).removeDblWhitespace().trimString().split(' ');
            if (parseInt(msg[0].replace(':', '')) > -1 && msg[0].indexOf(':') > -1 || msg[0] == ':') {
                msg.shift();
                string_date = msg[1] + ' ' + msg[2] + ' ' + msg[3] + ' ' + msg[4];

            } else if (msg[0].indexOf(':') > -1 || msg[1].indexOf(':') > -1 || msg[2].indexOf(':') > -1 || msg[3].indexOf(':') > -1) {
                string_date = msg[0] + ' ' + msg[1] + ' ' + msg[2] + ' ' + msg[3];
            }
            if (Date.parse(string_date)) {
                date = new Date(Date.parse(string_date));
                msg.shift();
                msg.shift();
                msg.shift();
                msg.shift();
            } else {
                date = new Date();
            }
            result.date = date.toFormat('MM-DD-YYYY')
            result.time = date.toFormat('HH24:MI:SS')
            //result.id = Date.parse(new Date());
           
            msg = msg.join(' ').trimString();
            result.content = msg;
        }
    }
    callback(result);
}




var config = {
    levels: {
        "Emergency": 7,
        "Alert": 6,
        "Critical": 5,
        "Error": 4,
        "Warning": 3,
        "Notice": 2,
        "Informational": 1, 
        "Debug":0
    }
}

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: 'Notice' }),
      //new (winston.transports.File)({ level: 'Informational', filename: __dirname + '/syslog.log',maxsize:10000000,json:false }),
      new (winston.transports.DailyRotateFile)({ level: 'Informational', filename: __dirname + '/syslog.log', json:false, datePattern: '.dd-MM-yyyy' })
    ],
    levels: config.levels,

});






server.on("error", function (err) {
    console.log("server error:\n" + err.stack);
    server.close();
});
server.on("message", function (msg, rinfo) {
    msg = msg.toString('ascii', 0, rinfo.size);
    parse(msg, rinfo, function (result) {
        //console.log(JSON.stringify(result, null, 4));
        var line = {
            "id": result.id,
            "ipv": result.ipv46,
            "date": result.date,
            "time": result.time,
            "facility": result.facility,
            "severity": result.severity,
            "host": result.host,
            "msg": result.content

        }

        app.io.room('syslogd').broadcast('message', line)

        logger.log(line.severity, line.host + '\t' +line.date + ' ' + line.time + '\t' + line.facility + '\t' +  line.msg);
    });
});
server.on("listening", function () {
    var address = server.address();
    console.log("server listening " + address.address + ":" + address.port);
});

server.bind(514);