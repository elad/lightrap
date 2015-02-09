var first_id = 0;

// Auto-incrementing sequence field.
// From http://docs.mongodb.org/manual/tutorial/create-an-auto-incrementing-field/

function hook_init(config) {
	this.log({ message: '[serial_id] Initializing' });

	this.db.get('counters').insert({ collection: 'issues', seq: first_id });

	// See https://github.com/Automattic/monk/issues/72
	this.db.get('issues').id = function (s) { return s; };
}

function hook_orm_models(orm_models) {
	var issue_model = orm_models.issue;
	if (issue_model) {
		this.log({ message: '[serial_id] Patching issue ORM model' });
		issue_model._id = Number;
	}
}

function get_auto_increment_id(req, collection, callback) {
	req.log({ message: '[serial_id] Acquiring serial id', collection: collection });

	return req.db.get('counters').findAndModify({ collection: collection }, { $inc: { seq: 1 } }, { upsert: true, new: true }, function (err, doc) {
		if (err) {
			req.log({ message: 'serial_id::get_auto_increment_id: findAndModify failed', err: err, collection: collection });
			err = { code: 500, message: 'Internal error' };
		}

		return callback(err, doc ? doc.seq : null);
	});
}

// Serial id generator, for when the backend doesn't provide them.
function hook_create(req, res, next) {
	this.log({ message: '[serial_id] Assigning serial id to new issue' });

	return get_auto_increment_id(req, 'issue', function (err, id) {
		req.body._id = id;
		return next();
	});
}

module.exports.hooks = {
	init: hook_init,
	orm_models: hook_orm_models,
	create: hook_create
};
