var _ = require('underscore');

function create(req, doc, callback) {
	doc.created_on = doc.updated_on = (new Date);
	doc.deleted_on = null;

	return req.models.issue.create(doc, function (err, doc) {
		if (err) {
			req.log({ message: 'issue::create: create failed', err: err });
			err = { code: 500, message: 'Internal error' };
		}

		return callback(err, doc);
	});
}

function get(req, id, callback) {
	return req.models.issue.get(id, function (err, doc) {
		if (err) {
			req.log({ message: 'issue::get: get failed', id: id, err: err });
			err = { code: 500, message: 'Internal error' };
		} else if (!doc || doc.deleted_on) {
			req.log({ message: 'Issue not found', id: id });
			err = { code: 404, message: 'Issue not found' };
		}

		return callback(err, err ? undefined : doc);
	});
}

function list(req, filter, callback) {
	var query = { deleted_on: null };
	if (filter) {
		// TODO
	}

	return req.models.issue.find(query, function (err, docs) {
		if (err) {
			req.log({ database: true, err: err, place_id: place_id }, 'issue::list: find failed');
			err = { code: 500, message: 'Internal error' };
		}

		return callback(err, docs);
	});
}

function update(req, id, doc, callback) {
	return get(req, id, function (err, existing_doc) {
		if (err) {
			return callback(err);
		}

		doc.id = existing_doc.id;
		doc.created_on = existing_doc.created_on;
		doc.updated_on = (new Date);
		doc.deleted_on = null;
		doc = _.extend(existing_doc, doc);

		return doc.save(function (err) {
			return callback(err, err ? undefined : doc);
		});
	});
}

function destroy(req, id, whiteout, callback) {
	return get(req, id, function (err, doc) {
		if (err) {
			return callback(err);
		}

		if (whiteout) {
			doc.deleted_on = (new Date);
			return doc.save(callback);
		} else {
			return doc.remove(callback);
		}
	});
}

// Exports
module.exports.create = create;
module.exports.get = get;
module.exports.list = list;
module.exports.update = update;
module.exports.delete = destroy;
