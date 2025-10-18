"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
var mongoose_1 = require("mongoose");
var UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'management', 'manager', 'lead', 'employee'],
        default: 'employee'
    },
    hourly_rate: {
        type: Number,
        default: 0,
        min: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_approved_by_super_admin: {
        type: Boolean,
        default: false
    },
    manager_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    password_hash: {
        type: String,
        required: false
    },
    // Secure credential management fields
    temporary_password: {
        type: String,
        required: false,
        select: false // Never include in regular queries for security
    },
    password_expires_at: {
        type: Date,
        required: false
    },
    is_temporary_password: {
        type: Boolean,
        default: false
    },
    password_reset_token: {
        type: String,
        required: false,
        select: false // Never include in regular queries for security
    },
    password_reset_expires: {
        type: Date,
        required: false
    },
    failed_login_attempts: {
        type: Number,
        default: 0
    },
    last_failed_login: {
        type: Date,
        required: false
    },
    account_locked_until: {
        type: Date,
        required: false
    },
    last_password_change: {
        type: Date,
        required: false
    },
    force_password_change: {
        type: Boolean,
        default: false
    },
    // Soft delete fields
    deleted_at: {
        type: Date,
        required: false
    },
    deleted_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    deleted_reason: {
        type: String,
        required: false
    },
    // Hard delete fields
    is_hard_deleted: {
        type: Boolean,
        default: false
    },
    hard_deleted_at: {
        type: Date,
        required: false
    },
    hard_deleted_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
// Indexes
// Note: email already has unique index via unique: true in schema definition
UserSchema.index({ role: 1 });
UserSchema.index({ is_active: 1 });
UserSchema.index({ manager_id: 1 });
UserSchema.index({ deleted_at: 1 }, { sparse: true }); // Sparse index for soft delete queries
UserSchema.index({ password_reset_token: 1 }, { sparse: true }); // Sparse index, rarely used
UserSchema.index({ password_expires_at: 1 }, { sparse: true }); // Sparse index for expired passwords
UserSchema.index({ account_locked_until: 1 }, { sparse: true }); // Sparse index for locked accounts
// Virtual for ID as string
UserSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
UserSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        // Never expose sensitive security fields
        if (ret.password_hash)
            delete ret.password_hash;
        if (ret.temporary_password)
            delete ret.temporary_password;
        if (ret.password_reset_token)
            delete ret.password_reset_token;
        return ret;
    }
});
var User = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
exports.User = User;
exports.default = User;
