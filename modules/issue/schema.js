var revalidator = require('revalidator');

var schema = {
	properties: {
		_id: {
			description: 'id',
			type: ['string', 'null'],
			format: 'object-id'
		},
		created_on: {
			description: 'create timestamp',
			type: ['string', 'null'],
			format: 'date-time'
		},
		updated_on: {
			description: 'update timestamp',
			type: ['string', 'null'],
			format: 'date-time'
		},
		deleted_on: {
			description: 'delete timestamp',
			type: ['string', 'null'],
			format: 'date-time'
		},
		synopsis: {
			description: 'synopsis',
			type: 'string'
		},
		state: {
			description: 'state',
			type: 'string',
			enum: ['open', 'closed']
		},
		description: {
			description: 'description',
			type: 'string'
		},
		hidden: {
			description: 'hidden flag',
			type: 'boolean',
			default: false
		}
	}
};

function validate(object) {
	var result = revalidator.validate(object, schema, { additionalProperties: false });

	return result;
}

// Exports
module.exports.validate = validate;
