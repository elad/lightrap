var _ = require('underscore');

function create(req, doc, callback) {
	return req.db_id('issues', function (err, id) {
		if (err) {
			return callback(err);
		}

		doc._id = id;
		doc.created_on = doc.updated_on = (new Date);
		doc.deleted_on = null;

		return req.db.get('issues').insert(doc, function (err, doc) {
			if (err) {
				req.log({ message: 'issue::create: insert failed', err: err });
				err = { code: 500, message: 'Internal error' };
			}

			return callback(err, doc);
		});
	});
}

function get(req, id, callback) {
	return req.db.get('issues').findById(id, function (err, doc) {
		if (err) {
			req.log({ message: 'issue::get: findById failed', id: id, err: err });
			err = { code: 500, message: 'Internal error' };
		} else if (!doc || doc.deleted_on) {
			req.log({ message: 'Issue not found', id: id });
			err = { code: 404, message: 'Issue not found' };
		}

		return callback(err, doc);
	});
}

function list(req, filter, callback) {
	var query = { deleted_on: null };
	if (filter) {
		// TODO
	}

	return req.db.get('issues').find(query, function (err, docs) {
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

		doc._id = existing_doc._id;
		doc.created_on = existing_doc.created_on;
		doc.updated_on = (new Date);
		doc.deleted_on = null;
		doc = _.extend(existing_doc, doc);

		return req.db.get('issues').findAndModify({ _id: doc._id }, doc, { new: true }, function (err, doc) {
			if (err) {
				req.log({ message: 'issue::update: findAndModify failed', id: id, err: err });
				err = { code: 500, message: 'Internal error' };
			}

			return callback(err, doc);
		});
	});
}

function destroy(req, id, whiteout, callback) {
	if (whiteout) {
		return req.db.get('issues').findAndModify({ _id: id }, { $set: { deleted_on: (new Date) } }, function (err, doc) {
			if (err) {
				req.log({ message: 'issue::destroy: findAndModify failed', err: err, id: id });
				err = { code: 500, message: 'Internal error' };
			}

			return callback(err);
		});
	} else {
		return req.db.get('issues').remove({ _id: id }, { justOne: true }, function (err) {
			if (err) {
				req.log({ message: 'issue::destroy: remove failed', err: err, id: id });
				err = { code: 500, message: 'Internal error' };
			}

			return callback(err);
		});
	}
}

// Exports
module.exports.create = create;
module.exports.get = get;
module.exports.list = list;
module.exports.update = update;
module.exports.delete = destroy;
