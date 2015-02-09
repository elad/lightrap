var util = require('util'),
    domain = require('domain'),
    _ = require('underscore'),
    uuid = require('node-uuid'),
    orm = require('orm');

// Logging
function log(log_context, message) {
	var payload = typeof(message) === 'object' ? message : { message: message };
	console.log(_.extend(payload, log_context));
}
function get_logger(context) {
	context = _.extend(context || {}, {
	    	id: uuid.v4()
	});
	return log.bind(context);
}
function middleware_logger(req, res, next) {
	// Create permanent logging parameters.
	req.log = get_logger({
		request_id: req.headers['x-request-id'],
		method: req.method,
		endpoint: req.url,
		client: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
	});

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

// ORM
var orm_models = {};
var middleware_orm = {
	define: function(db, models, next) {
		for (var k in orm_models) {
			models[k] = db.define(k, orm_models[k]);
		}

		next();
	}
}

// Exports
module.exports.get_logger = get_logger;
module.exports.logger = middleware_logger;
module.exports.domain = middleware_domain;
module.exports.error_handler = middleware_error_handler;
module.exports.orm_models = orm_models;
module.exports.orm = middleware_orm;
