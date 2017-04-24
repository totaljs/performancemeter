const Fs = require('fs');
const Path = require('path');
const Exec = require('child_process').execFile;

const BENCHMARK = {};
var FILENAME = Path.join('.performancemeter_' + Math.floor(Math.random() * 65536).toString(36) + '_');

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
		fn = (init || '') + 'function $RUN(){' + fn.toString() + '}var $CPU$=process.cpuUsage();$MMIN$=0,$MMAX$=0,INDEX=0;const $TIME$=Date.now(),$MAX$=+process.argv[2];function NEXT(){var mem=process.memoryUsage().heapUsed;$MMIN$=Math.min($MMIN$,mem);$MMAX$=Math.max($MMAX$,mem);if(INDEX<$MAX$){INDEX++;$RUN();return}$CPU$=process.cpuUsage($CPU$);console.log((Date.now() - $TIME$)+\',\'+$MMIN$+\',\'+$MMAX$+\',\'+$CPU$.user)}$RUN()';
	else
		fn = (init || '') + 'function $RUN(){' + fn.toString() + '}var $CPU$=process.cpuUsage();var $MMIN$=0,$MMAX$=0,INDEX=0;const $TIME$=Date.now(),$MAX$=+process.argv[2];while(INDEX++<$MAX$)$RUN();var mem=process.memoryUsage().heapUsed;$CPU$=process.cpuUsage($CPU$);console.log(Date.now() - $TIME$+\',\'+mem+\',\'+mem+\',\'+$CPU$.user)';

	var filename = FILENAME + BENCHMARK.queue.length + '.js';
	Fs.writeFileSync(filename, fn);
	BENCHMARK.queue.push({ name: name, filename: filename, results: [], memory: [], fn: fn });
	return exports;
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

		BENCHMARK.queue.forEach(function(item) {
			var time = [];
			var memory = [];
			var cpu = [];

			item.results.forEach(function(r) {
				time.push(r.time);
				memory.push(r.memory);
				cpu.push(r.cpu);
			});

			item.result = Math.round(median(time));
			item.memory = Math.round(median(memory));
			item.cpu = Math.round(median(cpu)) / 1000;
			max = Math.max(max, item.result);
		});

		BENCHMARK.queue.forEach(function(item, index) {
			item.percentage = (100 - ((item.result / max) * 100)).toFixed(1);
			if (!index) {
				prev = item.percentage;
				return;
			} else if (item.percentage !== prev)
				same = false;
		});

		console.log('');

		BENCHMARK.queue.forEach(function(item) {
			console.log('[ ' + padRight(item.name + ' ', 30, '.') + ' ' + ((same ? 'same performance' : item.percentage === '0.0' ? 'slowest' : ('+' + item.percentage + '% fastest')) + ' (' + item.result + ' ms)').replace(/\)$/g, ', ' + (item.memory / 1024 / 1024).toFixed(2) + ' MB, CPU: ' + item.cpu.toFixed(0) + ' ms)'));
		});

		console.log('');
		BENCHMARK.callback && BENCHMARK.callback(BENCHMARK.queue);
		BENCHMARK.queue.forEach(function(item) {
			Fs.unlink(item.filename, NOOP);
		});
	};

	for (var i = 0, length = BENCHMARK.queue.length; i < length; i++)
		BENCHMARK.queue.results = [];

	console.log('------ round (' + BENCHMARK.round + '/' + BENCHMARK.rounds + ')');
	next();
	return exports;
};

function NOOP() {
}

function measure(item, next) {
	Exec('node', [item.filename, BENCHMARK.max], function(err, response) {
		var res = response.trim().split(',');
		item.results.push({ time: +res[0], memory: (+res[1] + res[2]) / 2, cpu: +res[3] });
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