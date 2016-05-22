'use strict';

const gulp = require('gulp');
const stylus = require('gulp-stylus');
const plumber = require('gulp-plumber');
const errorHandler = require('gulp-plumber-error-handler');
const gulpIf = require('gulp-if');
const rupture = require('rupture');
// const stylint = require('gulp-stylint');
// const importIfExist = require('stylus-import-if-exist');
const autoprefixer = require('autoprefixer-stylus');
const gcmq = require('gulp-group-css-media-queries');
const nano = require('gulp-cssnano');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const debug = require('gulp-debug');
const del = require('del');
const jade = require('gulp-jade');
const prettify = require('gulp-jsbeautifier');
const inheritance = require('gulp-jade-inheritance');
const cached = require('gulp-cached');
const filter = require('gulp-filter');
const getData = require('jade-get-data');
const newer = require('gulp-newer');
// const cache = require('gulp-cache');
// const remember = require('gulp-remember');
// const spritesmith = 'gulp.spritesmith';
const spritesmith = require('gulp.spritesmith-multi');
// const checkIconsInDir = require('spritesmith-dir-checker');
const merge = require('merge-stream');
const path = require('path');
const debuga = require('debuga');
const browserSync = require('browser-sync').create();
const svgSymbols = require('gulp-svg-symbols');
const ghpages = require('gulp-gh-pages');
const zip = require('gulp-zip');

const isDebug = process.env.NODE_ENV !== 'production';

gulp.task('styles', function() {
  return gulp.src('app/styles/app.styl', {base: 'app'})
    .pipe(plumber({errorHandler: errorHandler(`Error in \'styles\' task`)}))
    .pipe(gulpIf(isDebug, sourcemaps.init()))
    .pipe(stylus({
			use: [
				// importIfExist(),
				rupture(),
				autoprefixer()
			],
			'include css': true
		}))
    // .pipe(debug({title: 'stylus'}))
    .pipe(gulpIf(!isDebug, gcmq()))
    .pipe(gulpIf(!isDebug, nano({zindex: false})))
    .pipe(rename({suffix: '.min'}))
		.pipe(gulpIf(isDebug, sourcemaps.write()))
    .pipe(gulp.dest('dist'));
});

// gulp.task('styles:lint', function() {
// 	gulp.src('app/styles/**/*.styl')
// 		.pipe(stylint({
// 			reporter: {
// 				reporter: 'stylint-stylish',
// 				reporterOptions: {verbose: true}
// 			}
// 		}))
// 		.pipe(stylint.reporter())
// });

const data = { // How it works???
	getData: getData('app/data'),
	jv0: 'javascript:void(0);',
	timestamp: Date.now()
};

gulp.task('templates', function() {
  return gulp.src('app/**/*.jade')
		.pipe(plumber({errorHandler: errorHandler(`Error in \'templates\' task`)}))
		.pipe(cached('jade'))
		.pipe(gulpIf(global.watch, inheritance({basedir: 'app/jade'}))) // ???
		.pipe(filter(file => /app[\\\/]jade[\\\/]pages/.test(file.path)))
		.pipe(jade({basedir: 'app/jade', data}))
		.pipe(prettify({
			braceStyle: 'expand',
			indentWithTabs: true,
			indentInnerHtml: true,
			preserveNewlines: true,
			endWithNewline: true,
			wrapLineLength: 120,
			maxPreserveNewlines: 50,
			wrapAttributesIndentSize: 1,
			unformatted: ['use']
		}))
		.pipe(rename({dirname: '.'}))
		.pipe(gulp.dest('dist'))
});


// const cwd = path.join(__dirname, '..');
const spritesDirPath = 'app/assets/images/sprites';
const imgPath = '../images/sprites/';
const tmplName = 'stylus_retina.template.handlebars';
const tmplPath = './node_modules/spritesmith-stylus-retina-template/';
const cssTemplate = tmplPath + tmplName;

gulp.task('sprites', function() {
	const spriteData = gulp.src(['app/assets/images/sprites/**/*.png', '!app/assets/images/sprites/*.png'])
		.pipe(plumber({errorHandler: errorHandler(`Error in 'sprites' task`)}))
		.pipe(spritesmith({
			spritesmith(options) {
				options.imgPath = imgPath + options.imgName;
				options.retinaImgPath = imgPath + options.retinaImgName;
				options.cssName = options.cssName.replace(/\.css$/, '.styl');
				options.cssFormat = 'stylus';
				options.cssTemplate = cssTemplate;
				options.algorithm = 'binary-tree';
				options.padding = 8;

				return options;
			}
		}));

	const imgStream = spriteData.img.pipe(gulp.dest('dist/assets/images/sprites'));
	const styleStream = spriteData.css.pipe(gulp.dest('app/styles/helpers/sprites'));

	return merge(imgStream, styleStream);
});



gulp.task('icons', function () {
	return gulp.src('app/assets/images/icons/*.svg').pipe(plumber({ errorHandler: errorHandler('Error in \'icons\' task') })).pipe(svgSymbols({
		title: false,
		id: 'icon_%f',
		className: '%f',
		templates: ['./node_modules/stylus-svg-size-template/svg-size.styl', 'default-svg']
	})).pipe(gulpIf(/\.styl$/, gulp.dest('app/styles/helpers'))).pipe(gulpIf(/\.svg$/, rename('icon.svg'))).pipe(gulpIf(/\.svg$/, gulp.dest('dist/assets/images/icons')));
});

gulp.task('assets', function() {
  return gulp.src(['app/assets/images/*.{png,jpg,svg}', 'app/assets/favicons/*.*', 'app/assets/fonts/*.*'], {base: 'app'})
		.pipe(cached('assets'))
    .pipe(newer('dist'))
    // .pipe(debug({title: 'assets'}))
    .pipe(gulp.dest('dist'));
});

gulp.task('server', function() {
	browserSync.init({
		server: 'dist'
	});

	browserSync.watch('dist/**/*.*').on('change', browserSync.reload);
});

gulp.task('clean', function() {
  return del('dist');
});

// ------- ZIP -------
const correctNumber = function correctNumber(number) {
	return number < 10 ? '0' + number : number;
};

const getDateTime = function getDateTime() {
	const now = new Date();
	const year = now.getFullYear();
	const month = correctNumber(now.getMonth() + 1);
	const day = correctNumber(now.getDate());
	const hours = correctNumber(now.getHours());
	const minutes = correctNumber(now.getMinutes());

	return year + '-' + month + '-' + day + '-' + hours + ':' + minutes;
};

gulp.task('zip', function () {
	const datetime = getDateTime();
	const zipName = 'dist_' + datetime + '.zip';

	return gulp.src(['dist/**/*', '!dist/*.zip']).pipe(zip(zipName)).pipe(gulp.dest('dist'));
});

gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('styles', 'assets', 'templates', 'sprites', 'icons'))
);

gulp.task('watch', function() {
	gulp.watch('app/styles/**/*.*', gulp.series('styles'))
	gulp.watch('app/jade/**/*.*', gulp.series('templates'))
	gulp.watch('app/assets/**/*.*', gulp.series('assets'))
});

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'server')));

gulp.task('deploy', function() {
	gulp.src(['dist/**/*', '!dist/robots.txt']).pipe(ghpages({branch: 'dist'}))
});
