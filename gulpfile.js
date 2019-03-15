/* -------------------------------------------------------------------------------------------------

Build Configuration
Contributors: Luan Gjokaj

-------------------------------------------------------------------------------------------------- */
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const cachebust = require('gulp-cache-bust');
const concat = require('gulp-concat');
const cssnano = require('cssnano');
const postcssPresetEnv = require('postcss-preset-env');
const del = require('del');
const fileinclude = require('gulp-file-include');
const gulp = require('gulp');
const beeper = require('beeper');
const colours = require('ansi-colors');
const log = require('fancy-log');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const modRewrite = require('connect-modrewrite');
const postcssImport = require('postcss-import');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
PostCSS Plugins
-------------------------------------------------------------------------------------------------- */
const postcssPluginsDev = [
	postcssImport,
	postcssPresetEnv({
		stage: 0,
		features: {
			'nesting-rules': true,
			'color-mod-function': true,
			'custom-media': true,
		},
	}),
];
const postcssPluginsProd = [
	postcssImport,
	postcssPresetEnv({
		stage: 0,
		features: {
			'nesting-rules': true,
			'color-mod-function': true,
			'custom-media': true,
		},
	}),
	cssnano({
		reduceIdents: false,
	}),
];
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Header & Footer JavaScript Bundles
-------------------------------------------------------------------------------------------------- */
const headerJS = ['src/etc/analytics.js', 'node_modules/aos/dist/aos.js'];
const footerJS = ['node_modules/jquery/dist/jquery.js', 'src/assets/js/**'];
//--------------------------------------------------------------------------------------------------

/**************************************
***** Shared Tasks
***************************************/
const cleanupTask = (done) => {
	del.sync(['app/**']);
    done();
};

const copyImagesTask = () => {
	return gulp
		.src('src/assets/img/**')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(gulp.dest('app/assets/img'));
};

const copyFontsTask = () => {
	return gulp
		.src('src/assets/fonts/**')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(gulp.dest('app/assets/fonts'));
};

const processImagesTask = () => {
	return gulp
		.src('src/assets/img/**')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(
			imagemin([imagemin.svgo({ plugins: [{ removeViewBox: true }] })], {
				verbose: true,
			}),
		)
		.pipe(gulp.dest('app/assets/img'));
};

/* -------------------------------------------------------------------------------------------------
Development Tasks
-------------------------------------------------------------------------------------------------- */

const styleDevTask = () => {
	return gulp
		.src('src/assets/style/main.css')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init())
		.pipe(postcss(postcssPluginsDev))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('app/assets/css'))
		.pipe(browserSync.stream({ match: '**/*.css' }));
};
const headerScriptsDevTask = () => {
	return gulp
		.src(headerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init())
		.pipe(concat('top.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('app/assets/js'));
};


const footerScriptsDevTask = () => {
	return gulp
		.src(footerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init())
		.pipe(
			babel({
				presets: ['@babel/env'],
			}),
		)
		.pipe(concat('bundle.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('app/assets/js'));
};

const processStaticFilesDevTask = () => {
	return gulp
		.src(['src/*.html'])
		.pipe(plumber({ errorHandler: onError }))
		.pipe(
			fileinclude({
				filters: {
					prefix: '@@',
					basepath: '@file',
				},
			}),
		)
		.pipe(
			cachebust({
				type: 'timestamp',
			}),
		)
		.pipe(gulp.dest('app'));
};

const reloadBrowser = (done) => {
	browserSync.reload();
	done();
};

const reloadJsTask = gulp.series(footerScriptsDevTask, reloadBrowser);

const reloadImagesTask = gulp.series(copyImagesTask, reloadBrowser);

const reloadFontsTask = gulp.series(copyFontsTask, reloadBrowser);

const reloadFilesTask = gulp.series(processStaticFilesDevTask, reloadBrowser);

const watchTask = () => {
	gulp.watch('src/assets/style/**/*.css', gulp.parallel(styleDevTask));
	gulp.watch('src/assets/js/**', gulp.parallel(reloadJsTask));
	gulp.watch('src/assets/img/**', gulp.parallel(reloadImagesTask));
	gulp.watch('src/assets/fonts/**', gulp.parallel(reloadFontsTask));
	gulp.watch('src/*.html', gulp.parallel(reloadFilesTask));
	gulp.watch('src/includes/**', gulp.parallel(reloadFilesTask));
};

const initBrowserSync = () => {
    browserSync.init({
        server: {
            baseDir: 'app',
        },
        middleware: [modRewrite(['^.([^\\.]+)$ /$1.html [L]'])],
    });
};

const buildDevTask = gulp.series(
        cleanupTask,
        gulp.parallel(
            styleDevTask,
            copyImagesTask,
            copyFontsTask,
            headerScriptsDevTask,
            footerScriptsDevTask,
            processStaticFilesDevTask
        ),
        gulp.parallel(
            watchTask,
            initBrowserSync
        )
    );

//--------------------------------------------------------------------------------------------------

/* -------------------------------------------------------------------------------------------------
Utility Tasks
-------------------------------------------------------------------------------------------------- */
const swb = colours.bgBlue(colours.bold.white('Static Web Build'));
const swbUrl = ' - ' + colours.bgWhite(colours.bold.underline.blue('https://staticbuild.website/'));
const thankYou = 'Thank you for using the ' + swb + swbUrl;
const errorMsg = colours.bgRed(colours.bold.white('Error'));
const filesGenerated =
	'Your distribution files are generated in: ' + colours.bold.white(__dirname + '/app/') + ' - ✅';

const onError = (err) => {
	beeper();
	log(swb + ' - ' + errorMsg + ' ' + err.toString());
	// this.emit('end');
};

/* -------------------------------------------------------------------------------------------------
Production Tasks
-------------------------------------------------------------------------------------------------- */
const thankYouNotice = (done) => {
    done();
	beeper();
	log('\n\n' + filesGenerated);
	log(thankYou);
};

const styleProdTask = () => {
	return gulp
		.src('src/assets/style/main.css')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(postcss(postcssPluginsProd))
		.pipe(gulp.dest('app/assets/css'));
};

const copyHtaccessTask = () => {
	return gulp
		.src('src/etc/.htaccess')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(gulp.dest('app'));
};

const headerScriptsProdTask = () => {
	return gulp
		.src(headerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(concat('top.js'))
		.pipe(uglify())
		.pipe(gulp.dest('app/assets/js'));
};

const footerScriptsProdTask = () => {
	return gulp
		.src(footerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(
			babel({
				presets: ['@babel/env'],
			}),
		)
		.pipe(concat('bundle.js'))
		.pipe(uglify())
		.pipe(gulp.dest('app/assets/js'));
};

const processStaticFilesProdTask = () => {
	return gulp
		.src(['src/*.html'])
		.pipe(plumber({ errorHandler: onError }))
		.pipe(
			fileinclude({
				filters: {
					prefix: '@@',
					basepath: '@file',
				},
			}),
		)
		.pipe(
			cachebust({
				type: 'timestamp',
			}),
		)
		.pipe(
			htmlmin({
				collapseWhitespace: true,
				ignoreCustomFragments: [/<%[\s\S]*?%>/, /<\?[=|php]?[\s\S]*?\?>/],
			}),
		)
		.pipe(gulp.dest('app'));
};

const buildProdTask = gulp.series(
        cleanupTask,
        gulp.parallel(
            styleProdTask,
            copyHtaccessTask,
            copyImagesTask,
            copyFontsTask,
            headerScriptsProdTask,
            footerScriptsProdTask,
            processStaticFilesProdTask,
        ),
        thankYouNotice
    );
/**
* exporting the two main tasks
*/
exports['build-dev'] = buildDevTask;
exports['build-prod'] = buildProdTask;
/* -------------------------------------------------------------------------------------------------
End of all Tasks
-------------------------------------------------------------------------------------------------- */
