var util = require('util'),
    domain = require('domain'),
    _ = require('underscore'),
    uuid = require('node-uuid');

// Logging
function log(log_context, message) {
	var payload = typeof(message) === 'object' ? message : { message: message };
	console.log(_.extend(payload, log_context));
}
function middleware_logger(req, res, next) {
	// Create permanent logging parameters.
	var id = uuid.v4();
	req.log_context = {
	    	id: id,
		request_id: req.headers['x-request-id'] || id,
		method: req.method,
		endpoint: req.url,
		client: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
	};

	req.log = log.bind(req.log_context);

	next();
}

// Domain (for graceful exception handling)
function common_exception_handler(err, req, res) {
	console.log(err.stack);

	if (!res.headersSent) {
		res.status(500).send('Internal error');
	}

	req.log({ stack: err.stack, message: 'Uncaught exception' });
}
function middleware_domain(req, res, next) {
	var d = domain.create();
	d.on('error', function (err) {
		common_exception_handler(err, req, res);

		try {
			var kill_timer = setTimeout(function () {
				process.exit(1);
			}, 5 * 1000);
			kill_timer.unref();
			//cluster.worker.disconnect();
		} catch (err2) {
			console.log('Nested error:', err2.stack);
		}

		d.dispose();
	});

	//d.add(req);
	//d.add(res);

	d.run(next);
}

// Error handling
function middleware_error_handler(err, req, res, next) {
	common_exception_handler(err, req, res);
}

// Exports
module.exports.logger = middleware_logger;
module.exports.domain = middleware_domain;
module.exports.error_handler = middleware_error_handler;
