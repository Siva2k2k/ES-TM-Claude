"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var winston_1 = require("winston");
// winston is exported directly from require; access `format` on the module
var _a = winston_1.format, combine = _a.combine, timestamp = _a.timestamp, errors = _a.errors, json = _a.json, colorize = _a.colorize, simple = _a.simple, printf = _a.printf;
// Custom format for console output
var consoleFormat = printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp, stack = _a.stack;
    return "".concat(timestamp, " [").concat(level, "]: ").concat(stack || message);
});
// Create Winston logger
exports.logger = winston_1.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    defaultMeta: { service: 'timesheet-backend' },
    transports: [
        // Console transport
        new winston_1.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat)
        }),
        // File transport for errors
        new winston_1.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for all logs
        new winston_1.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ],
});
// If we're not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.transports.Console({
        format: winston_1.format.simple()
    }));
}
exports.default = exports.logger;
