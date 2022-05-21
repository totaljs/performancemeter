# Node.js Performance Meter

[![NPM version][npm-version-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

A simple JavaScript performance meter.

- installation `$ npm install performancemeter`
- www.totaljs.com

```js
const Meter = require('performancemeter');

// Optional
// Meter.name('Bla bla bla');

// NEW: restricts output data
// Meter.multiple();

// Optional, default: "medium" (other types: "veryeasy", "easy", "medium", "hard", "veryhard")
Meter.mode('easy');
// or sets 10 cycles, veryeasy === 100, easy = 100000, medium = 10000000, hard = 10000000000
Meter.mode(10);

// Meter.measure(TEST_NAME, function_test, [function_init]);
// @TEST_NAME {String}
// @function_test {Function}
// @function_init {Function} optional, can contains init values

// Example 1:
Meter.measure('String.indexOf()', 'str.indexOf("meter")', 'var str = "Performance meter"');
Meter.measure('RegExp.test()', 'reg.test(str)', 'var reg = /meter/; var str = "Performance meter');

// Example 2:
Meter.measure('String.indexOf()', () => str.indexOf('meter'), 'var str = "Performance meter"');
Meter.measure('RegExp.test()', () => reg.test(str), 'var reg = /meter/; var str = "Performance meter"');

// Example 3:
Meter.measure('String.indexOf()', function() {
	str.indexOf('meter');
}, function() {
	var str = 'Performance meter';
});

Meter.measure('RegExp.test()', function() {
	reg.test(str);
}, function() {
	var reg = /meter/;
	var str = 'Performance meter';
});

// Async example:
Meter.measure('nextTick', function() {
	process.nextTick(NEXT);
});

Meter.measure('immediate', function() {
	setImmediate(NEXT);
});

// NEW: With a custom counter
Meter.measure('nextTick', function() {
	COUNT++;
	process.nextTick(NEXT);
});

Meter.measure('immediate', function() {
	COUNT++;
	setImmediate(NEXT);
});
```

## Contact

- contact form <https://www.totaljs.com/contact/>
- <info@totaljs.com>

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt

[npm-url]: https://npmjs.org/package/performancemeter
[npm-version-image]: https://img.shields.io/npm/v/performancemeter.svg?style=flat
[npm-downloads-image]: https://img.shields.io/npm/dm/performancemeter.svg?style=flat
