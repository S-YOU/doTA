/* global process */
function wpad(str, n, c) {
	var l = (str + '').length;
	var s = str + Array(l < n ? n - l + 1 : 0).join(' ');
	return c ? `\x1b[${c}m${s}\x1b[0m` : s;
}

function human(diff, n, c) {
	if (diff > 1e6) {
		return wpad((diff / 1e6).toFixed(3) + 'ms', n, c);
	} else {
		return wpad((diff / 1e3).toFixed(3) + 'μs', n, c);
	}
}

function Timer() {
	var latest = process.hrtime();
	var timers = {};
	timer(1); //initiated first timer
	return timer;

	function timer(k, label, times) {
		if (label) {
			if (!timers[k]) {
				timers[k] = latest;
			}
			if (timers[k]) {
				var t2 = process.hrtime(), t1 = timers[k],
					diff = (t2[0] * 1e9 + t2[1]) - (t1[0] * 1e9 + t1[1]);
				var args = Array.prototype.slice.call(arguments, 1);

				args.unshift(human(diff, 11, 31));
				if (times) {
					args[args.length-1] = '(' + (human(diff / times, 0, 91)) + ')';
				}
				console.error.apply(undefined, args);
			}
		}
		timers[k] = latest = process.hrtime();
	}
}

module.exports = Timer();