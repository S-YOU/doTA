var gulp = require('gulp');

gulp.task('clean', function(){
  var del = require('del');
  return del(['dist/*']);
});

gulp.task('copy:doTA', function() {
  return gulp.src(['doTA.js']).pipe(gulp.dest('dist'));
});

gulp.task('copy:ngDoTA', function() {
  var concat = require('gulp-concat');
  return gulp.src(['doTA.js', 'ngDoTA.js'])
    .pipe(concat('ngDoTA.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('copy', ['copy:doTA', 'copy:ngDoTA']);

gulp.task('uglify', ['copy'], function() {
  var closure = require('gulp-closure-compiler-service');
  var uglify = require('gulp-uglify');
  var replace = require('gulp-replace');
  var rename = require('gulp-rename');
  return gulp.src(['dist/*.js', '!dist/*.min.js'])
    // .pipe(replace(/^\s*console\.log.*$/gm, ''))
    .pipe(replace(/^\s*console\..*$/gm, ''))
    .pipe(replace(/\bIndent\([^)]+\)\s*\+\s*|\\n(?=['"}]|$)/g, ''))
    .pipe(closure())
    .pipe(uglify())
    .pipe(replace(/\bthis\.(\$event=[^,]+),/g, 'var $1;'))
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
