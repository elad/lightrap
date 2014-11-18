var gnats = require('gnats'),
    mailparser = new (require('mailparser').MailParser)();

// Convert a GNATS problem report to a JSON issue.
function pr_to_issue(pr) {
	return {
		synopsis: pr.synopsis,
		state: pr.state,
		hidden: pr.confidential === 'yes'
	};
}

function hook_create_raw(req, res, next) {
	if (req.query.format === 'gnats.text') {
		var pr = gnats.parse(req.rawBody);
		req.body = pr_to_issue(pr);

		return next();
	} else if (req.query.format === 'gnats.mail') {
		mailparser.on('end', function (mail_object) {
			var pr = gnats.parse(mail_object.text);
			pr.headers = mail_object.headers;

			req.body = pr_to_issue(pr);

			return next();
		});
		mailparser.write(req.rawBody);
		return mailparser.end();
	} else {
		return next();
	}
}

module.exports.hooks = {
	create_raw: hook_create_raw
};
