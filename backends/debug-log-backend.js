'use strict';

var inspect = require('util').inspect;
var process = require('process');
var globalConsole = require('console');
var chalk = require('chalk');

var COLOR_MAP = {
    fatal: 'bgRed',
    error: 'bgRed',
    warn: 'bgYellow',
    access: 'bgGreen',
    info: 'bgGreen',
    debug: 'bgBlue',
    trace: 'bgCyan'
};

module.exports = DebugLogBackend;

function DebugLogBackend(namespace, opts) {
    /*eslint max-statements: [2, 25]*/
    if (!(this instanceof DebugLogBackend)) {
        return new DebugLogBackend(namespace, opts);
    }

    var self = this;

    self.console = opts.console || globalConsole;
    self.assert = opts.assert;
    self.colors = typeof opts.colors === 'boolean' ?
        opts.colors : true;
    /*eslint no-process-env: 0*/
    self.env = opts.env || process.env;
    self.namespace = namespace.toUpperCase();

    var debugEnviron = self.env.NODE_DEBUG || '';
    var regex = new RegExp('\\b' + self.namespace + '\\b', 'i');

    self.enabled = typeof opts.enabled === 'boolean' ?
        opts.enabled : true;
    self.verbose = opts.verbose || regex.test(debugEnviron);
    self.trace = typeof opts.trace === 'boolean' ?
        opts.trace : (self.verbose && !!self.env.TRACE);

    if (self.verbose) {
        self.enabled = true;
    }
}

DebugLogBackend.prototype.createStream = function createStream() {
    var self = this;

    return DebugLogStream(self.namespace, self);
};

function DebugLogStream(namespace, backend) {
    if (!(this instanceof DebugLogStream)) {
        return new DebugLogStream(namespace, backend);
    }

    var self = this;

    self.namespace = namespace;
    self.backend = backend;
}

DebugLogStream.prototype.write = function write(logRecord, cb) {
    /*eslint complexity: [2, 15]*/
    var self = this;

    var levelName = logRecord.levelName;

    if (
        (levelName === 'fatal' || levelName === 'error') ||
        (self.backend.enabled &&
            (levelName === 'warn' || levelName === 'info')) ||
        (self.backend.verbose &&
            (levelName === 'access' || levelName === 'debug')) ||
        (self.backend.trace && levelName === 'trace')
    ) {
        var msg = self.formatMessage(logRecord);
        if (self.backend.assert) {
            self.backend.assert.comment(msg);
        } else {
            self.backend.console.error(msg);
        }
    }

    if (levelName === 'fatal' || levelName === 'error') {
        throw new Error(logRecord.fields.msg);
    }

    if (cb) {
        cb();
    }
};

DebugLogStream.prototype.formatMessage =
function formatMessage(logRecord) {
    var self = this;

    var prefix = self.namespace + ' ' +
        logRecord.levelName.toUpperCase() + ':';
    var color = COLOR_MAP[logRecord.levelName];

    if (self.backend.colors) {
        prefix = chalk[color](prefix);
        prefix = chalk.bold(prefix);
    }

    return prefix + ' ' + logRecord.fields.msg + ' ~ ' +
        inspect(logRecord.meta);
};
