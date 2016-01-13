# nms.js 
========
Open source network management system for Node.js

The goal is for nms.js to be a truly distributed, scalable management application platform for all aspects of the [FCAPS](https://en.wikipedia.org/wiki/FCAPS) network management model, much like [OpenNMS](http://www.opennms.org).

The project relies heavely on a few core modules:



+ [keypress](https://github.com/TooTallNate/keypress) - Emits keypress events from any readble stream such as `prcoess.stdin`.
+ [lineman](https://github.com/PrimeEuler/nms.js/blob/master/lib/sheldon/lib/lineman.js) - Line manager listens for keypress events and navigates and emits a line buffer much like [readline](https://github.com/nodejs/node/blob/master/lib/readline.js).
+ [sheldon](https://github.com/PrimeEuler/nms.js/tree/master/lib/sheldon) - Sheldon listens for line and keypress events to provide a thin shell around javascript. It uses [minimist](https://github.com/substack/minimist) to parse emited lines into arguments. The first argument is assumed to be the path to a javascript object and is passed to the [lodash](https://github.com/lodash/lodash) `_.get(sheldon.context, path)` function. If the `typeOf` javascipt object is `function`,  the parameter names of the function are read and the rest of the minimist arguments are applied by name or in order to the function and it is called. If any parameter names are missing from the `minimist` arguments, `lineman` asks/prompts for those parameters by name.  All other objects are formatted with `util.inspect` and written to a writeable stream such as `process.stdout` via `lineman`. 
+ [nms.js](https://github.com/PrimeEuler/nms.js) - NMS.js simply adds network management tools to the `sheldon.context` object. 

Install
=======

```bash
$ npm install nms.js
```
ToDo:
```bash
the internet of everything...
