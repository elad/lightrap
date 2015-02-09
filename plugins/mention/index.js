var _ = require('underscore');

var default_domain = 'netbsd.org',
    cross_project_mentions = {
	netbsd: 'netbsd.org',
	freebsd: 'freebsd.org',
	openbsd: 'openbsd.org'
    };

var mention_regex = /(([a-z0-9]+)?@([a-z0-9.]+)?)[ ']*/gi;

function mention(req, issue_object) {
	if (!issue_object || !issue_object.description) {
		return;
	}

	// Detect mentions.
	var matches = mention_regex.exec(issue_object.description),
	    mentions = [];
	while (matches) {
		var mention = [matches[1]];
		matches[2] && mention.push(matches[2]);
		matches[3] && mention.push(matches[3]);
		mentions.push(mention);

		matches = mention_regex.exec(issue_object.description);
	}

	// Handle mentions.
	_.each(mentions, function (mention) {
		if (mention[2]) {
			var domain = cross_project_mentions[mention[2]];
			if (!domain) {
				req.log({ message: '[mention] WARNING: No target', mention: mention[0] });
				return;
			}
		} else {
			domain = default_domain;
		}
		var email = mention[1] + '@' + domain;
		req.log({ message: 'Notifying', mention: mention[0], target: email });
	});
}

function hook_create(req, res, next) {
	mention(req, req.body);
	return next();
}

function hook_update(req, res, next) {
	mention(req.body);
	return next();
}

module.exports.hooks = {
	create: hook_create,
	update: hook_update
};
