var env = 'dev';
var src  = './front_src';
var dest = './web';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var glob = require('glob');
var path = require('path');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var bower = require('main-bower-files');
var _ = require('lodash');

gulp.task('bower', function() {
    return gulp
        .src(bower(), {base: src + '/bower_components'})
        .pipe(gulp.dest(dest + '/bower'));
});

gulp.task('scripts', function() {
    var arrayBundle = function(srcArray) {
        _.each(srcArray, function(sourcePath) { 
            browserify({
                entries: sourcePath,
                debug: env == 'dev',
                paths: [src + '/bower_components', './module']
            })
            .bundle()
            .on('error', handleErrors)
            .pipe(source(path.basename(sourcePath)))
            .pipe(buffer())
            .pipe(env == 'prod' ? $.uglify() : $.util.noop())
            .pipe(gulp.dest(dest + '/js'));
        });
    };

    glob(src + '/scripts/*.js', {}, function(er, files) {
        arrayBundle(files);
    });
});

gulp.task('styles', function () {
    return gulp
        .src(src + '/styles/*.scss')
        .pipe(env == 'dev' ? $.sourcemaps.init() : $.util.noop())
        .pipe($.sass({
            includePaths: [src + '/bower_components'],
            imagePath: '../images'
        }))
        .on('error', handleErrors)
        .pipe($.autoprefixer({ browsers: ['> 1%'] }))
        .pipe(env == 'dev' ? $.sourcemaps.write() : $.util.noop())
        .pipe(env == 'prod' ? $.csso() : $.util.noop())
        .pipe(gulp.dest(dest + '/css'));
});

gulp.task('watch', function() {
    $.watch(src + '/styles/**/*.scss', function () {
        gulp.start('styles');
    });
    $.watch([
        src + '/scripts/**/*.js',
        src + '/bower_components/clam/**/*.js',
        './module/**/*.js'
    ], function () {
        gulp.start('scripts');
    });
});

gulp.task('env-to-prod', function() {env = 'prod'});

gulp.task('build', ['env-to-prod', 'bower', 'scripts', 'styles', 'images']);
gulp.task('default', ['build']);

function handleErrors() {
    var args = Array.prototype.slice.call(arguments);

    // Send error to notification center with gulp-notify
    $.notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
    }).apply(this, args);

    // Keep gulp from hanging on this task
    this.emit('end');
};
