var gulp = require('gulp');

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
  var uglify = require('gulp-uglify');
  var replace = require('gulp-replace');
  var rename = require('gulp-rename');
  return gulp.src(['dist/*.js', '!dist/*.min.js'])
    .pipe(replace(/^\s*console\.log.*$/gm, ''))
    .pipe(replace(/\bD\([^)]+\)\s*\+\s*|\\n(?=['"}]|$)/g, ''))
    .pipe(uglify({mangle:true,compress:{unsafe: true}}))
    .on('error', console.error)
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['uglify']);

gulp.task('watch', ['uglify'], function() {
  gulp.watch(['doTA.js', 'ngDoTA.js'], ['uglify']);
});
