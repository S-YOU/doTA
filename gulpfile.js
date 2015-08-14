var gulp = require('gulp');
var replace = require('gulp-replace');

gulp.task('clean', function(){
  var del = require('del');
  return del(['dist/*']);
});

gulp.task('copy:doTA', function() {
  return gulp.src(['doTA.js'])
  .pipe(fnInline())
  .pipe(gulp.dest('dist'));
});

gulp.task('copy:ngDoTA', function() {
  var concat = require('gulp-concat');
  return gulp.src(['doTA.js', 'ngDoTA.js'])
    .pipe(fnInline())
    .pipe(concat('ngDoTA.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('copy', ['copy:doTA', 'copy:ngDoTA']);

gulp.task('uglify', ['copy'], function() {
  var closure = require('gulp-closure-compiler-service');
  var uglify = require('gulp-uglify');
  var rename = require('gulp-rename');
  return gulp.src(['dist/*.js', '!dist/*.min.js'])
    // .pipe(replace(/^\s*console\.log.*$/gm, ''))
    .pipe(replace(/^\s*console\..*$/gm, ''))
    .pipe(replace(/\bindent\([^)]+\)\s*\+\s*|\\n(?=['"}]|$)/g, ''))
    .pipe(closure())
    .pipe(uglify())
    //.pipe(replace(/\bthis\.(\$event=[^,]+),/g, 'var $1;'))
    .on('error', console.error)
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['clean', 'uglify']);

gulp.task('watch', function() {
  gulp.watch(['doTA.js', 'ngDoTA.js'], ['copy']);
});

////////////////////////

function fnInline() {
  // pos2 = getOuterHTMLEnd(html2, tagStartPos2);
  // var LVL=1,POS=tagStartPos2;do POS=html2.indexOf("<",POS+1),"/"===html2.charAt(POS+1)?LVL--:LVL++,POS=html2.indexOf(">",POS),"/"===html2.charAt(POS-1)&&LVL--;while(0<LVL);++POS;pos2 = POS;
  return replace(/(\w+)\s*=\s*getOuterHTMLEnd\((\w+)\s*,\s*(\w+)\);/g,
    'LVL=1,$1=$3;do $1=$2.indexOf("<",$1+1),"/"===$2.charAt($1+1)?LVL--:LVL++,$1=$2.indexOf(">",$1),"/"===$2.charAt($1-1)&&LVL--;while(0<LVL);++$1;')
}
