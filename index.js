const BENCHMARK = {};
BENCHMARK.max = 0;
BENCHMARK.round = 0;
BENCHMARK.rounds = 6;
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
		case 'low':
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

exports.measure = function(name, fn, init) {

	if (typeof(init) === 'function')
		init = clean(init);

	if (typeof(fn) === 'function')
		fn = clean(fn);

	if (init && init[init.length - 1] !== ';')
		init += ';';

	if (fn && fn[fn.length - 1] !== ';')
		fn += ';';

	fn = new Function('$max', (init || '') + 'var $i=0;while($i++<$max){' + fn.toString().replace(/\;{2,}/, '') + '}');
	BENCHMARK.queue.push({ name: name, results: [], fn: fn });
};

exports.exec = function(callback) {

	console.log('===================================');
	console.log('> JavaScript Performance Meter v1 <');
	BENCHMARK.name && console.log('> Name: ' + BENCHMARK.name);
	console.log('===================================');
	console.log('');

	BENCHMARK.round = 0;

	for (var i = 0, length = BENCHMARK.queue.length; i < length; i++)
		BENCHMARK.queue.results = [];

	while (BENCHMARK.round < BENCHMARK.rounds) {
		var msg = '------ round (' + BENCHMARK.round + '/' + (BENCHMARK.rounds - 1) + ')';
		BENCHMARK.round && console.time(msg);

		for (var i = 0, length = BENCHMARK.queue.length; i < length; i++) {
			var item = BENCHMARK.queue[i];
			measure(item);
		}

		for (var i = BENCHMARK.queue.length - 1; i > -1; i--) {
			var item = BENCHMARK.queue[i];
			measure(item);
		}

		for (var i = 0, length = BENCHMARK.queue.length; i < length; i++) {
			var item = BENCHMARK.queue[i];
			measure(item);
		}

		BENCHMARK.round && console.timeEnd(msg);
		BENCHMARK.round++;
	}

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
	callback && callback();
};

function measure(item) {
	var ticks = Date.now();
	item.fn(BENCHMARK.max);
	item.results.push(Date.now() - ticks);
}

function clean(fn) {
	fn = fn.toString().trim();
	if (fn[0] === '(') {
		fn = fn.substring(fn.indexOf('=>') + 2).trim();
		if (fn[0] === '{')
			fn = fn.substring(1, fn.length - 1);
	} else
		fn = fn.substring(fn.indexOf('{') + 1, fn.length - 1);

	if (fn[fn.length - 1] !== ';')
		fn += ';';

	return fn;
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