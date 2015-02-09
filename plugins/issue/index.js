var crud = require('./crud');

function hook_init(config) {
	config.orm_models.issue = {
		_id: String,
		synopsis: String,
		state: String,
		description: String,
		created_on: Date,
		updated_on: Date,
		deleted_on: Date		
	};
}

// Exports
module.exports.hooks = {
	init: hook_init,
	route: crud.route
}