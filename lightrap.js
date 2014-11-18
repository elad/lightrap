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
	    middleware = require('middleware');

	var db = monk('localhost/lightrap');
	if (!db) {
		throw new Error('Could not connect to database.');
	}

	// Auto-incrementing sequence field.
	// From http://docs.mongodb.org/manual/tutorial/create-an-auto-incrementing-field/
	function get_auto_increment_id(req, collection, callback) {
		return db.get('counters').findAndModify({ collection: collection }, { $inc: { seq: 1 } }, { upsert: true, new: true }, function (err, doc) {
			if (err) {
				req.log({ message: 'get_auto_increment_id: findAndModify failed', err: err, collection: collection });
				err = { code: 500, message: 'Internal error' };
			}

			callback(err, doc ? doc.seq : null);
		});
	}

	var plugins = { hooks: {} };
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
			var counters = db.get('counters');
			counters.insert({ collection: 'issues', seq: 0 });

			// See https://github.com/Automattic/monk/issues/72
			db.get('issues').id = function (s) { return s; };

			return callback(null);
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
			app.use(function (req, res, next) {
				// Attach database.
				req.db = db;
				req.db_id = get_auto_increment_id.bind(null, req);

				// Attach plugins.
				req.plugins = plugins;

				next();
			});

			// Modules.
			var modules = [
				'issue',
			];
			for (var i = 0, _len = modules.length; i < _len; i++) {
				require('modules/' + modules[i]).route(app);
			}

			app.use(middleware.error_handler);

			var port = parseInt(process.argv[2]) || 7777,
			    server = app.listen(port, function () {
				console.log('listening on port', server.address().port);
			});
		},
	]);
}
