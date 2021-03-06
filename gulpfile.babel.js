'use strict';

import gulp           from 'gulp';
import del            from 'del';
import watch          from 'gulp-watch';
import mainBowerFiles from 'main-bower-files';
import gulpFilter     from 'gulp-filter';
import runSequence    from 'run-sequence';
import fs             from 'fs';
import jade           from 'gulp-jade';
import prettify       from 'gulp-prettify';
import posthtml       from 'gulp-posthtml';
import sass           from 'gulp-sass';
import csso           from 'gulp-csso';
import perfectionist  from 'perfectionist';
import postcss        from 'gulp-postcss';
// import pxtorem        from 'postcss-pxtorem';
import bulkSass       from 'gulp-sass-glob-import';
import babel          from 'gulp-babel';
import uglify         from 'gulp-uglify';
import imagemin       from 'gulp-imagemin';
import browserSync    from 'browser-sync';

let PROCESSORS = [
    // pxtorem({
    //     root_value: 14,
    //     selector_black_list: ['html']
    // }),
    require('autoprefixer')({ browsers: ['last 2 versions', '> 1%'] }),
    require("css-mqpacker"),
    require('postcss-custom-selectors'),
    require('postcss-focus-hover')
];

let BOWER_MAIN_FILES_CONFIG = {
    includeDev: true,
    paths:{
        bowerDirectory: './assets/bower',
        bowerJson: './bower.json'
    }
};

let reload = browserSync.reload;

let log = (error) => {
    console.log([
        '',
        "----------ERROR MESSAGE START----------",
        ("[" + error.name + " in " + error.plugin + "]"),
        error.message,
        "----------ERROR MESSAGE END----------",
        ''
    ].join('\n'));
    this.end();
};

gulp.task('imagemin_clear', () => {
    return del(['app/img/']);
});

gulp.task('imagemin_build', () => {
    return gulp.src('./assets/images/**')
        .pipe(imagemin({progressive: true}))
        .pipe(gulp.dest('app/img/'));
});

gulp.task('imagemin', () => {
    runSequence('imagemin_clear', 'imagemin_build');
});

gulp.task('browserSync', () => {
    browserSync({
        server: {
            baseDir: "./app/"
        },
        open: false
    })
});

gulp.task('jade', () => {
    let data = JSON.parse(fs.readFileSync('./assets/data/data.json', 'utf-8'));

    return gulp.src('./assets/pages/!(_)*.jade')
        .pipe(jade({
            // pretty: true,
            locals: data,
        })).on('error', log)
        .pipe(posthtml([
            require('posthtml-bem')({
                elemPrefix: '__',
                modPrefix: '_',
                modDlmtr: '--'
            })
        ]))
        .pipe(prettify({indent_size: 4}))
        .pipe(gulp.dest('./app/'))
        .on('end', browserSync.reload)
});

gulp.task('bootstrap', () => {
    return gulp.src(['./assets/scss/bootstrap/**/bootstrap.scss'])
        .pipe(sass({
            includePaths: ['assets/bower/bootstrap-sass/assets/stylesheets/']
        }).on('error', sass.logError))

        .pipe(postcss(PROCESSORS))
        .pipe(csso())
        .pipe(postcss([perfectionist({})]))
        .pipe(gulp.dest('./app/css'))
        .pipe(reload({stream: true}))
});

gulp.task('scss', () => {
    return gulp.src(['assets/scss/**/style.scss'])
        .pipe(bulkSass())
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss(PROCESSORS))
        .pipe(csso())
        .pipe(postcss([perfectionist({})]))
        .pipe(gulp.dest('./app/css'))
        .pipe(reload({stream: true}))
});

gulp.task('babel', () => {
    return gulp.src(['./assets/babel/**/*.js'])
        .pipe(babel({
            comments: false,
            presets: ['es2015']
        })) .on('error', console.error.bind(console))
        .pipe(gulp.dest('./app/js/'))
        .on('end', browserSync.reload)
});

gulp.task('copyMiscFiles', () => {
    return gulp.src(['assets/misc/**'])
        .pipe(gulp.dest('app/'))
});

gulp.task('copyFontFiles', () => {
    return gulp.src(['assets/font/**'])
        .pipe(gulp.dest('app/font'))
});

gulp.task('buildBowerCSS', () => {
    var cssFilter = gulpFilter('**/*.css')
    return gulp.src(mainBowerFiles(BOWER_MAIN_FILES_CONFIG))
        .pipe(cssFilter)
        .pipe(postcss(PROCESSORS))
        .pipe(csso())
        .pipe(postcss([perfectionist({})]))
        .pipe(gulp.dest('app/css'))
});

gulp.task('buildBowerJS', () => {
    var jsFilter = gulpFilter('**/*.js')
    return gulp.src(mainBowerFiles(BOWER_MAIN_FILES_CONFIG))
        .pipe(jsFilter)
        .pipe(uglify())
        .pipe(gulp.dest('app/js'))
});

gulp.task('static', () => {
    runSequence('copyMiscFiles', 'copyFontFiles', 'buildBowerCSS', 'buildBowerJS');
});

gulp.task('default', ['browserSync'], () => {
    watch(['assets/components/**/*.scss', 'assets/scss/**/*.scss'], () => gulp.start('scss'));
    watch(['assets/scss/bootstrap/**/*.scss'], () => gulp.start('bootstrap'));
    watch(['assets/components/**/*.jade', 'assets/pages/**/*.jade', 'assets/data/**/*.json'], () => gulp.start('jade'));
    watch(['assets/misc/**', 'assets/libs/**', 'assets/font/**'], () => gulp.start('static'));
    watch(['assets/images/**'], () => gulp.start('imagemin'));
    watch(['assets/babel/**/*.js'], () => gulp.start('babel'));
});
