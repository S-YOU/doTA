/* global process */
function wpad(str, n, c) {
	var l = (str + '').length;
	var s = str + Array(l < n ? n - l + 1 : 0).join(' ');
	return c ? '\033[31m' + s + '\033[0m' : s;
}

function Timer() {
	var latest = process.hrtime();
	var timers = {};
	var timer = function(k, label) {
		if (label) {
			if (!timers[k]) {
				timers[k] = latest;
			}
			if (timers[k]) {
				var t2 = process.hrtime(), t1 = timers[k],
					diff = (t2[0] * 1e9 + t2[1]) - (t1[0] * 1e9 + t1[1]);
				var args = Array.prototype.slice.call(arguments, 1);

				if (diff > 1e6) {
					args.unshift(wpad(diff / 1e6 + 'ms', 11, 1));
				} else {
					args.unshift(wpad(diff / 1e3 + 'μs', 11));
				}
				console.error.apply(undefined, args);
			}
		}
		timers[k] = latest = process.hrtime();
	};
	timer(1); //initiated first timer
	return timer;
}

module.exports = Timer();