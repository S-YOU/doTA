(function(){
	var gulp = require('gulp');

	gulp.task('default', ['clean', 'uglify']);

	gulp.task('watch', function() {
		gulp.watch(['doTA.js', 'ngDoTA.js'], ['copy']);
	});

	//////////////////////////////

	var replace = require('gulp-replace');

	gulp.task('clean', function(){
		var del = require('del');
		return del(['dist/*']);
	});

	gulp.task('copy:doTA', function() {
		return gulp.src(['doTA.js'])
		.pipe(replace.apply(this, inline1))
		.pipe(replace.apply(this, inline2))
		.pipe(gulp.dest('dist'));
	});

	gulp.task('copy:ngDoTA', function() {
		var concat = require('gulp-concat');
		return gulp.src(['doTA.js', 'ngDoTA.js'])
			.pipe(replace.apply(this, inline1))
			.pipe(replace.apply(this, inline2))
			.pipe(concat('ngDoTA.js'))
			.pipe(gulp.dest('dist'));
	});

	gulp.task('copy', ['copy:doTA', 'copy:ngDoTA']);

	gulp.task('uglify', ['copy'], function() {
		var closure = require('gulp-closure-compiler-service');
		var uglify = require('gulp-uglify');
		var rename = require('gulp-rename');
		var sourcemaps = require('gulp-sourcemaps');

		return gulp.src(['dist/*.js', '!dist/*.min.js'])
			// .pipe(replace(/^\s*console\.log.*$/gm, ''))
			.pipe(sourcemaps.init())
			.pipe(replace(/^\s*console\..*$/gm, ''))
			.pipe(replace(/\bindent\([^)]+\)\s*\+\s*|\\n(?=['"}]|$)/g, ''))
			.pipe(closure())
			.pipe(uglify({mangle:true, compress:{drop_console: true}}))
			.on('error', console.error)
			.pipe(rename({
				extname: '.min.js'
			}))
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest('dist'));
	});

	gulp.task('docs:example:index', makeExampleIndex);
	gulp.task('docs', ['docs:example:index']);

	////////////////////////

	var inline1 = [
		/(\w+)\s*=\s*getOuterHTMLEnd\((\w+)\s*,\s*(\w+)\);/g,
		'LVL=1,$1=$3;for(;;){$1=$2.indexOf(">",$1);if("/"===$2.charAt($1-1)&&(LVL--,0>=LVL))break;$1=$2.indexOf("<",$1);if("/"===$2.charAt($1+1)){if(LVL--,0>=LVL){$1=$2.indexOf(">",$1+2);break}}else"!"!==$2.charAt($1+1)&&LVL++}$1++; //INLINE'
	];

	var inline2 = [
		/=\s*decodeEntities\(([^)]+)\)/g,
		'=0>$1.indexOf("&")?$1:$1.replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").replace(/&quot;/g,\'"\'); //INLINE'
	];

	function makeExampleIndex() {
		var BASE = './examples';
		var TITLE = 'doTA - Examples Index';
		var before = '<html><head><meta charset="utf-8"><title>' + TITLE + '</title></head><body><h1>' + TITLE + '</h1><ul>';
		var fs = require('fs');
		var path = require('path');
		var dirs = fs.readdirSync(BASE);
		var ret = [];
		dirs.forEach(function(subFolder) {
			subFolder = path.join(BASE, subFolder);
			var stats = fs.statSync(subFolder);
			// console.log('stats', stats);
			if (stats.isDirectory(subFolder)) {
				fs.readdirSync(subFolder).forEach(function(file) {
					if (/\.htm.?$/i.test(file)) {
						var fullPath = path.join(subFolder, file);
						var buffer = fs.readFileSync(fullPath);
						var title = /<title>([\s\S]+?)<\/title>/.test(buffer) && RegExp.$1.trim();
						ret.push([stats.ctime, '<li><a href="../' + fullPath + '">' + title + '</a></li>']);
						// console.log(fullPath, title);
					}
				});
			}
		});
		ret.sort(function(a, b) { return a[0] - b[0]; });
		var after = '</ul></body></html>';
		fs.writeFileSync(path.join(BASE, 'index.html'),
			before + ret.map(function(x){ return x[1]; }).join('') + after);
		// return ret;
	}

	// console.log(makeExampleIndex());
})();
