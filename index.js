const Fs = require('fs');
const Os = require('os');
const Path = require('path');
const Exec = require('child_process').execFile;

const BENCHMARK = {};
var FILENAME = Path.join(Os.tmpdir(), 'performancemeter_' + Math.floor(Math.random() * 65536).toString(36) + '_');

BENCHMARK.max = 0;
BENCHMARK.index = 0;
BENCHMARK.round = 1;
BENCHMARK.rounds = 5;
BENCHMARK.queue = [];
BENCHMARK.exec = null;

exports.manually = function() {
	clearTimeout(BENCHMARK.exec);
};

exports.name = function(name) {
	BENCHMARK.name = name;
};

exports.mode = function(type) {
	switch (type) {
		case 'verylow':
		case 'veryeasy':
			BENCHMARK.max = 100;
			break;
		case 'low':
		case 'easy':
			BENCHMARK.max = 1000000;
			break;
		case 'medium':
			BENCHMARK.max = 10000000;
			break;
		case 'high':
		case 'hard':
			BENCHMARK.max = 100000000;
			break;
	}
};

exports.measure = function(name, fn, init, async) {

	if (typeof(init) === 'boolean') {
		async = init;
		init = undefined;
	}

	if (typeof(init) === 'function')
		init = clean(init);

	if (typeof(fn) === 'function')
		fn = clean(fn);

	fn = fn.trim();

	if (init)
		init = init.trim();

	if (init && init[init.length - 1] !== ';')
		init += ';';

	if (async || fn.indexOf('NEXT') !== -1)
		fn = (init || '') + 'function $RUN(){' + fn.toString() + '}var INDEX=0;const $TIME$=Date.now(),$MAX$=+process.argv[2];function NEXT(){if(INDEX<$MAX$){INDEX++;$RUN();return}console.log(Date.now() - $TIME$)}$RUN()';
	else
		fn = (init || '') + 'function $RUN(){' + fn.toString() + '}var INDEX=0;const $TIME$=Date.now(),$MAX$=+process.argv[2];while(INDEX++<$MAX$)$RUN();console.log(Date.now() - $TIME$)';

	var filename = FILENAME + BENCHMARK.queue.length + '.js';
	Fs.writeFileSync(filename, fn);
	BENCHMARK.queue.push({ name: name, filename: filename, results: [], fn: fn });
	return this;
};

exports.exec = function(callback) {

	console.log('===========================================================');
	console.log('> JavaScript Performance Meter v1');
	BENCHMARK.name && console.log('> Name: ' + BENCHMARK.name);
	console.log('===========================================================');
	console.log('');

	BENCHMARK.round = 1;
	BENCHMARK.index = 0;
	BENCHMARK.callback = callback;

	BENCHMARK.done = function() {

		var max = 0;
		var prev = 0;
		var same = true;

		BENCHMARK.queue.forEach(function(item, index) {
			item.result = Math.round(median(item.results));

			if (index === 0)
				prev = item.result;
			else if (prev !== item.result) {
				prev = item.result;
				same = false;
			}

			max = Math.max(max, item.result);
		});

		console.log('');

		BENCHMARK.queue.forEach(function(item) {
			var percentage = 100 - ((item.result / max) * 100) >> 0;
			console.log('[ ' + padRight(item.name + ' ', 30, '.') + ' ' + (same ? 'same performance' : percentage === 0 ? 'slowest' : ('+' + percentage + '% fastest')) + ' (' + item.result + ' ms)');
		});

		console.log('');
		BENCHMARK.callback && BENCHMARK.callback(BENCHMARK.queue);
		BENCHMARK.queue.forEach(function(item) {
			Fs.unlink(item.filename, function(){});
		});
	};

	for (var i = 0, length = BENCHMARK.queue.length; i < length; i++)
		BENCHMARK.queue.results = [];

	console.log('------ round (' + BENCHMARK.round + '/' + BENCHMARK.rounds + ')');
	next();
};

function measure(item, next) {
	Exec('node', [item.filename, BENCHMARK.max], function(err, response) {
		item.results.push(+response);
		err && console.log(err);
		next();
	});
}

function clean(fn) {
	fn = fn.toString().trim();

	if (fn[0] === '(') {
		fn = fn.substring(fn.indexOf('=>') + 2).trim();
		if (fn[0] === '{')
			fn = fn.substring(1, fn.length - 1).trim();
	} else
		fn = fn.substring(fn.indexOf('{') + 1, fn.length - 1).trim();

	if (fn[fn.length - 1] !== ';')
		fn += ';';

	return fn;
}

function next() {

	if (BENCHMARK.round >= BENCHMARK.rounds) {
		BENCHMARK.done();
		return;
	}

	var item = BENCHMARK.queue[BENCHMARK.index++];
	if (!item) {
		BENCHMARK.index = 0;
		BENCHMARK.round++;
		console.log('------ round (' + BENCHMARK.round + '/' + BENCHMARK.rounds + ')');
		return next();
	}

	measure(item, next);
}

function median(values) {
	values.sort((a, b) => a - b);
	var half = Math.floor(values.length / 2);
	return values.length % 2 ? values[half] : ((values[half-1] + values[half]) / 2.0);
}

function padRight(self, max, c) {
	var len = max - self.length;
	if (len < 0)
		return self;
	while (len--)
		self += c;
	return self;
}

exports.mode('medium');
BENCHMARK.exec = setTimeout(exports.exec, 100);