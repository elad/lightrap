var cluster = require('cluster');

var ncpus = 1; //require('os').cpus().length;

if (cluster.isMaster) {
	var net = require('net');

	var workers = [];

	function spawn(i) {
		workers[i] = cluster.fork();

		// Restart worker on exit
		workers[i].on('exit', function(code, signal) {
			console.log('worker died, id:', i, 'pid:', process.pid, '(respawning)');
			spawn(i);
		});
	}

	for (var i = 0; i < ncpus; i++) {
		spawn(i);
	}
} else {
	var fs = require('fs'),
	    path = require('path'),
	    _ = require('underscore'),
	    express = require('express'),
	    body_parser = require('body-parser'),
	    monk = require('monk'),
	    async = require('async'),
	    orm = require('orm'),
	    middleware = require('middleware');

	var db = monk('localhost/lightrap');
	if (!db) {
		throw new Error('Could not connect to database.');
	}

	var plugins = { hooks: {} };

	// Hook context for non-request hooks.
	var logger = middleware.get_logger(),
	    default_context = {
		db: db,
		log: logger
	};
	var hook = function(hook_name, context, args, callback) {
		context = context || default_context;
		args = args || [];
		args.push(callback);
		return async.each(plugins.hooks[hook_name] || [], function (hook, callback) {
			hook.fn.apply(context, args);
		}, callback);
	};

	async.series([
		function load_plugins(callback) {
			var plugin_root = './plugins',
			    plugins_dirs = fs.readdirSync(plugin_root);
			_.each(plugins_dirs, function (plugin_dir) {
				var plugin = require(path.join(plugin_root, plugin_dir));

				if (plugin.hooks) {
					_.each(plugin.hooks, function (fn, hook) {
						if (!plugins.hooks.hasOwnProperty(hook)) {
							plugins.hooks[hook] = [];
						}

						plugins.hooks[hook].push({ plugin: plugin_dir, fn: fn });
					});
				}
			});

			return callback();
		},

		function initialize(callback) {
			var config = {
				orm_models: middleware.orm_models
			};
			hook('init', null, [config]);
			hook('orm_models', null, [middleware.orm_models]);

			return callback();
		},

		function start_app(callback) {
			var app = express();

			// Middleware
			app.use(function (req, res, next) {
				res.header('Access-Control-Allow-Origin', '*');
				next();
			});
			app.use(middleware.domain);
			app.use(middleware.logger);
			app.use(body_parser.urlencoded({
				extended: true,
				verify: function (req, res, body) {
					req.rawBody = body.toString();
				}
			}));
			app.use(body_parser.json());
			app.use(orm.express('mongodb://localhost/lightrap', middleware.orm));
			app.use(function (req, res, next) {
				// Attach database.
				req.db = db;

				// Attach plugins.
				req.plugins = plugins;
				req.plugins.hook = function(hook_name, callback) {
					return async.each(req.plugins.hooks[hook_name] || [], function (hook, callback) {
						hook.fn.call(req, req, res, callback);
					}, callback);
				};

				next();
			});

			hook('route', null, [app]);

			app.use(middleware.error_handler);

			var port = parseInt(process.argv[2]) || 7777,
			    server = app.listen(port, function () {
			    	logger({ message: '[lightrap] Listening', port: server.address().port });
			});
		},
	]);
}
