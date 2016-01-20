
var Collector = require("Netflow");
var x = new Collector(function (err) {
    if (err != null) {
        console.log("ERROR ERROR \n" + err);
    }
})
.on("listening", function () { console.log("listening"); })
.on("packet", function (packet) {
    //console.log(packet);
    app.io.broadcast('packet', packet);
    console.log('-------------------------------');
    for (var i = 0; i < packet.v5Flows.length; i++) {

        var srcaddr = '';
        var dstaddr = '';
        var dlmt = '.';
        for (var oct = 0; oct < 4; oct++) {
            if (oct == 3) { dlmt = '' }
            srcaddr += packet.v5Flows[i].srcaddr[oct] + dlmt;
            dstaddr += packet.v5Flows[i].dstaddr[oct] + dlmt;
        }
        console.log(srcaddr + ':' + packet.v5Flows[i].srcport + ' --' + packet.v5Flows[i].dOctets + '--> ' + dstaddr + ":" + packet.v5Flows[i].dstport);


    }

    console.log('-------------------------------');
})
.listen(2055);