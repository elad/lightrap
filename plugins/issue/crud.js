var async = require('async'),
    schema = require('./schema'),
    core = require('./core');

function crud_validate(req, doc, res) {
	var result = schema.validate(doc);
	if (!result.valid) {
		req.log({ errors: result.errors, message: 'Invalid record' });
		res.status(400).send({ code: 400, message: 'Invalid record', errors: result.errors });
		return null;
	} else {
		return doc;
	}
}

function crud_create(req, res) {
	req.log({ message: 'Issue create request' });

	return async.series([
		function (callback) {
			return req.plugins.hook('create_raw', callback);
		},
		function (callback) {
			if (!crud_validate(req, req.body, res)) {
				return;
			}

			return req.plugins.hook('create', callback);
		}
	], function (err) {
		if (err) {
			return res.status(err.code).send(err);
		}

		return core.create(req, req.body, function (err, doc) {
			return err ? res.status(err.code).send(err) : res.send(doc);
		});
	});

	/*return async.series([
		function create_raw(callback) {
			return async.each(req.plugins.hooks.create_raw || [], function (hook, callback) {
				hook.fn(req, res, callback);
			}, callback);
		},

		function create(callback) {
			if (!crud_validate(req, req.body, res)) {
				return;
			}

			return async.each(req.plugins.hooks.create || [], function (hook, callback) {
				hook.fn(req, res, callback);
			}, callback);
		}
	], function (err) {
		if (err) {
			return res.status(err.code).send(err);
		}

		return core.create(req, req.body, function (err, doc) {
			return err ? res.status(err.code).send(err) : res.send(doc);
		});
	});*/
}

function crud_read(req, res) {
	req.log({ message: 'Issue read request', issue_id: req.params.issue_id, query: req.query });

	return async.series({
		records: function (callback) {
			if (req.params.issue_id) {
				return core.get(req, Number(req.params.issue_id), function (err, record) {
					return callback(err, record);
				});
			} else {
				// XXX
				var filter = null;
				return core.list(req, filter, function (err, records) {
					return callback(err, records);
				});
			}
		},
	}, function (err, results) {
		return err ? res.status(err.code).send(err) : res.send(results.records);
	});
}

function crud_update(req, res) {
	req.log({ message: 'Issue update request', issue_id: req.params.issue_id });

	var doc = crud_validate(req, req.body, res);
	if (!doc) {
		return;
	}

	return async.each(req.plugins.hooks.update || [], function (hook, callback) {
		hook.fn(req, res, callback);
	}, function (err) {
		if (err) {
			return res.status(err.code).send(err);
		}

		return core.update(req, Number(req.params.issue_id), doc, function (err, doc) {
			return err ? res.status(err.code).send(err) : res.send(doc);
		});
	});
}

function crud_delete(req, res) {
	req.log({ message: 'Issue delete request', issue_id: req.params.issue_id });

	return core.delete(req, Number(req.params.issue_id), true, function (err, doc) {
		return err ? res.status(err.code).send(err) : res.status(204).end();
	});
}

// Routes
module.exports.route = function (app) {
	app.post('/issues', crud_create);
	app.get('/issues', crud_read);
	app.get('/issues/:issue_id', crud_read);
	app.put('/issues/:issue_id', crud_update);
	app.delete('/issues/:issue_id', crud_delete);
}
