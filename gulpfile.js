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

  ////////////////////////

  var inline1 = [
    /(\w+)\s*=\s*getOuterHTMLEnd\((\w+)\s*,\s*(\w+)\);/g,
    'LVL=1,$1=$3;do $1=$2.indexOf("<",$1+1),"/"===$2.charAt($1+1)?LVL--:LVL++,$1=$2.indexOf(">",$1),"/"===$2.charAt($1-1)&&LVL--;while(0<LVL);++$1; //INLINE'
  ];
  var inline2 = [
    /=\s*decodeEntities\(([^)]+)\)/g,
    '=0>$1.indexOf("&")?$1:$1.replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").replace(/&quot;/g,\'"\'); //INLINE'
  ]
})();