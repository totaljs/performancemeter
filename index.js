const Fs = require('fs');
const Path = require('path');
const Exec = require('child_process').execFile;
const Os = require('os');

const BENCHMARK = {};
var FILENAME = Path.join(Os.tmpdir(), 'performance_' + Math.floor(Math.random() * 65536).toString(36) + '_');

BENCHMARK.max = 0;
BENCHMARK.index = 0;
BENCHMARK.round = 1;
BENCHMARK.rounds = 5;
BENCHMARK.queue = [];
BENCHMARK.exec = null;

exports.manually = function() {
	clearTimeout(BENCHMARK.exec);
	return exports;
};

exports.name = function(name) {
	BENCHMARK.name = name;
	return exports;
};

exports.mode = function(type) {

	if (type > 0) {
		BENCHMARK.max = type;
		return exports;
	}

	switch (type) {
		case 'verylow':
			BENCHMARK.max = 100;
			break;
		case 'low':
			BENCHMARK.max = 100000;
			break;
		case 'medium':
			BENCHMARK.max = 10000000;
			break;
		case 'high':
		case 'hard':
			BENCHMARK.max = 10000000000;
			break;
	}
	return exports;
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
		fn = (init || '') + 'function $RUN(){$MCOUNT$++;' + fn.toString() + '}var $MCOUNT$=0,$MMIN$=0,$MMAX$=0,INDEX=0;const $TIME$=Date.now(),$MAX$=+process.argv[2];function NEXT(){var mem=process.memoryUsage().heapUsed;$MMIN$=Math.min($MMIN$,mem);$MMAX$=Math.max($MMAX$,mem);if(INDEX<$MAX$){INDEX++;$RUN();return}console.log((Date.now()-$TIME$)+\',\'+$MMIN$+\',\'+$MMAX$+\',\'+$MCOUNT$)}$RUN()';
	else
		fn = (init || '') + 'function $RUN(){$MCOUNT$++;' + fn.toString() + '}var $MCOUNT$=0,$MMIN$=0,$MMAX$=0,INDEX=0;const $TIME$=Date.now(),$MAX$=+process.argv[2];while(INDEX++<$MAX$)$RUN();var mem=process.memoryUsage().heapUsed;console.log(Date.now()-$TIME$+\',\'+mem+\',\'+mem+\',\'+$MCOUNT$)';

	var filename = FILENAME + BENCHMARK.queue.length + '.js';
	Fs.writeFileSync(filename, fn);
	BENCHMARK.queue.push({ name: name, filename: filename, results: [], memory: [], count: 0, fn: fn, index: BENCHMARK.queue.length });
	return exports;
};

exports.exec = function(callback) {

	console.log('===========================================================');
	console.log('> JavaScript Performance Meter v4');
	BENCHMARK.name && console.log('> Name: ' + BENCHMARK.name);
	console.log('===========================================================');
	console.log('');
	console.time('Duration');

	BENCHMARK.round = 1;
	BENCHMARK.index = 0;
	BENCHMARK.callback = callback;

	BENCHMARK.done = function() {

		var max = 0;
		var prev = 0;
		var same = true;

		BENCHMARK.queue.forEach(function(item) {

			if (item.warming)
				return;

			var time = [];
			var memory = [];

			item.results.forEach(function(r) {
				time.push(r.time);
				memory.push(r.memory);
			});

			item.result = Math.round(median(time));
			item.memory = Math.round(median(memory));
			max = Math.max(max, item.result);
		});

		BENCHMARK.queue.forEach(function(item, index) {

			if (item.warming)
				return;

			item.percentage = item.result == 0 || max === 0 ? 0 : (100 - ((item.result / max) * 100)).toFixed(1);

			if (!index) {
				prev = item.percentage;
				return;
			} else if (item.percentage !== prev)
				same = false;
		});

		console.log('');

		var count = 0;

		BENCHMARK.queue.sort(function(a, b) {
			return a.index > b.index ? 1 : a.index === b.index ? 0 : -1;
		});

		BENCHMARK.queue.forEach(function(item) {

			if (item.warming)
				return;

			count = Math.max(count, item.count);
			console.log('[ ' + padRight(item.name + ' ', 30, '.') + ((same ? 'same performance' : item.percentage === '0.0' ? 'slowest' : ('+' + item.percentage + '% fastest')) + ' (' + item.result + ' ms)').replace(/\)$/g, ', memory: ' + (item.memory / 1024 / 1024).toFixed(2) + ' MB)'));
		});

		console.log('');

		console.log('Each test has been executed "' + count.format(0) + '" times.');
		console.timeEnd('Duration');

		console.log('');
		BENCHMARK.callback && BENCHMARK.callback(BENCHMARK.queue);
		BENCHMARK.queue.forEach(function(item) {
			Fs.unlinkSync(item.filename);
		});
	};

	for (var i = 0; i < BENCHMARK.queue.length; i++)
		BENCHMARK.queue.results = [];

	console.log('------ round (' + BENCHMARK.round + '/' + BENCHMARK.rounds + ')');
	next();

	return exports;
};

function measure(item, next) {
	Exec('node', [item.filename, BENCHMARK.max], function(err, response) {
		var res = response.trim().split(',');
		item.count += +res[3];
		item.results.push({ time: +res[0], memory: ((+res[1]) + (+res[2])) / 2 });

		if (err) {
			console.error('------ ERROR:', '"' + item.name + '"');
			console.error(err + '');
			next = null;
			console.log('------ canceled');
			BENCHMARK.queue.forEach(function(item) {
				try {
					Fs.unlinkSync(item.filename);
				} catch (e) {}
			});
			process.exit(1);
		} else
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

function randomize(arr) {
	for (var i = arr.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
	return arr;
}

function next() {

	if (BENCHMARK.round >= BENCHMARK.rounds) {
		BENCHMARK.done();
		return;
	}

	var item = BENCHMARK.queue[BENCHMARK.index++];
	if (!item) {
		randomize(BENCHMARK.queue);
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

Number.prototype.format = function(decimals, separator, separatorDecimal) {

	var self = this;
	var num = self.toString();
	var dec = '';
	var output = '';
	var minus = num[0] === '-' ? '-' : '';
	if (minus)
		num = num.substring(1);

	var index = num.indexOf('.');

	if (typeof(decimals) === 'string') {
		var tmp = separator;
		separator = decimals;
		decimals = tmp;
	}

	if (separator === undefined)
		separator = ' ';

	if (index !== -1) {
		dec = num.substring(index + 1);
		num = num.substring(0, index);
	}

	index = -1;
	for (var i = num.length - 1; i >= 0; i--) {
		index++;
		if (index > 0 && index % 3 === 0)
			output = separator + output;
		output = num[i] + output;
	}

	if (decimals || dec.length) {
		if (dec.length > decimals)
			dec = dec.substring(0, decimals || 0);
		else
			dec = dec.padRight(decimals || 0, '0');
	}

	if (dec.length && separatorDecimal === undefined)
		separatorDecimal = separator === '.' ? ',' : '.';

	return minus + output + (dec.length ? separatorDecimal + dec : '');
};

exports.mode('medium');
BENCHMARK.exec = setTimeout(exports.exec, 100);