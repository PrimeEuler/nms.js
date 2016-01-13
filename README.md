# nms.js 
Open source network management system for Node.js

The goal is for nms.js to be a truly distributed, scalable management application platform for all aspects of the [FCAPS](https://en.wikipedia.org/wiki/FCAPS) network management model, much like [OpenNMS](http://www.opennms.org).

The project relies heavely on a few core modules:



+ [keypress](https://github.com/TooTallNate/keypress) - Emits keypress events from any readble stream such as `prcoess.stdin`.
+ [lineman](https://github.com/PrimeEuler/nms.js/blob/master/lib/sheldon/lib/lineman.js) - Line manager listens for keypress events and navigates and emits a line buffer much like [readline](https://github.com/nodejs/node/blob/master/lib/readline.js).
+ [sheldon](https://github.com/PrimeEuler/nms.js/tree/master/lib/sheldon) - Sheldon listens for line and keypress events to provide a thin shell around javascript. It uses [minimist](https://github.com/substack/minimist) to parse emited lines into arguments. The first argument is assumed to be the path to a javascript object and is passed to the [lodash](https://github.com/lodash/lodash) `_.get(sheldon.context, path)` function. If the `typeOf` javascipt object is `function`,  the parameter names of the function are read and the rest of the minimist arguments are applied by name or in order to the function and it is called. If any parameter names are missing from the `minimist` arguments, `lineman` asks/prompts for those parameters by name.  All other objects are formatted with `util.inspect` and written to a writeable stream such as `process.stdout` via `lineman`. Two paths are provided by default within the `sheldon.context`, `os` (Node.js os API) and `terminal` which has two functions, `width` and `length` which gets or sets the terminal dimensoins of the writable stream. Example:
```bash
NMS-HOST#os
{ hostname: [Function: getHostname],
  loadavg: [Function: getLoadAvg],
  uptime: [Function: getUptime],
  freemem: [Function: getFreeMem],
  totalmem: [Function: getTotalMem],
  cpus: [Function: getCPUs],
  type: [Function: getOSType],
  release: [Function: getOSRelease],
  networkInterfaces: [Function: getInterfaceAddresses],
  homedir: [Function: getHomeDirectory],
  arch: [Function],
  platform: [Function],
  tmpdir: [Function],
  tmpDir: [Function],
  getNetworkInterfaces: [Function: deprecated],
  EOL: '\r\n',
  endianness: [Function] }
  
NMS-HOST#os.networkInterfaces
{ 'Local Area Connection':
   [ { address: 'fe99::f499:df99:f899:6299',
       netmask: 'ffff:ffff:ffff:ffff::',
       family: 'IPv6',
       mac: '00:99:99:99:99:99',
       scopeid: 11,
       internal: false },
     { address: '192.168.1.69',
       netmask: '255.255.255.0',
       family: 'IPv4',
       mac: '00:99:99:99:99:99',
       internal: false } ],
  'Loopback Pseudo-Interface 1':
   [ { address: '::1',
       netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
       family: 'IPv6',
       mac: '00:00:00:00:00:00',
       scopeid: 0,
       internal: true },
     { address: '127.0.0.1',
       netmask: '255.0.0.0',
       family: 'IPv4',
       mac: '00:00:00:00:00:00',
       internal: true } ] }

  ```
ToDo:
```bash
the internet of everything...
