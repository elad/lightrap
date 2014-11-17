var async = require('async'),
    gnats = require('gnats'),
    mailparser = new (require('mailparser').MailParser)(),
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

function pr_to_issue(pr) {
	return {
		synopsis: pr.synopsis,
		state: pr.state,
		hidden: pr.confidential === 'yes'
	};
}

function crud_create(req, res) {
	req.log({ message: 'Issue create request' });

	return async.series({
		doc: function (callback) {
			if (!req.query.format || req.query.format === 'json') {
				return callback(null, req.body);
			} else if (req.query.format === 'gnats.text') {
				var pr = gnats.parse(req.rawBody);
				return callback(null, pr_to_issue(pr));
			} else if (req.query.format === 'gnats.mail') {
				mailparser.on('end', function (mail_object) {
					var pr = gnats.parse(mail_object.text);
					pr.headers = mail_object.headers;
					return callback(null, pr_to_issue(pr));
				});
				mailparser.write(req.rawBody);
				return mailparser.end();
			} else {
				return callback({ code: 400, message: 'invalid format: ' + req.query.format });
			}
		}
	}, function (err, results) {
		if (err) {
			return res.status(err.code).send(err);
		}

		var doc = crud_validate(req, results.doc, res);
		if (!doc) {
			return;
		}

		return core.create(req, doc, function (err, doc) {
			return err ? res.status(err.code).send(err) : res.send(doc);
		});
	});
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

	return core.update(req, Number(req.params.issue_id), doc, function (err, doc) {
		return err ? res.status(err.code).send(err) : res.send(doc);
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
