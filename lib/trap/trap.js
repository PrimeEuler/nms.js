var snmp = require('snmpjs');
var mib = new require('./lib/mib');
var util = require('util');
var tl = snmp.createTrapListener();


var poo = new mib();
poo.LoadMIBs();
//1.3.6.1.4.1.9.10.62.1.2.3.1.1.2.14.84.117.110.110.101.108.48.45.104.101.97.100.45.48
poo.GetObject('1.3.6.1.2.1.15.3.1.14', function (Object) {
    //console.log(Object);
    //Object.OID
});

//cipSecEndPtRemoteType
//EndPtType

poo.GetObject('HistoryEventMedium', function (Object) {
    //console.log(Object);
    //Object.OID
});

poo.GetObject('1.3.6.1.4.1.9.10.62.1.2.3.1.1.2.14.84.117.110.110.101.108.48.45.104.101.97.100.45.48', function (Object) {
    //console.log(Object);
    //Object.OID
});
//poo.GetSummary(function (summary) {console.log(summary);});

//console.log(JSON.stringify(poo.Modules, null, 4));
poo.WriteToFile();

tl.on('trap', function (msg) {
    console.log(msg.src.address);
    var varbinds = snmp.message.serializer(msg)['pdu']['varbinds']
    for (var i = 0; i < varbinds.length; i++) {

        poo.ParseVarBind(varbinds[i], function(response) {
            console.log('\t',response.Object.ObjectName,response.OIDresidue, response.syntaxValue);
        });

    }

});

tl.bind({ family: 'udp4', port: 162 });


// num example: 3232236033
function inet_ntoa(num) {
    var nbuffer = new ArrayBuffer(4);
    var ndv = new DataView(nbuffer);
    ndv.setUint32(0, num);

    var a = new Array();
    for (var i = 0; i < 4; i++) {
        a[i] = ndv.getUint8(i);
    }
    return a.join('.');
}
