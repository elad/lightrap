var crud = require('./crud'),
    core = require('./core');

// Exports
module.exports.route = crud.route;
module.exports.get = core.get;
module.exports.list = core.list;
