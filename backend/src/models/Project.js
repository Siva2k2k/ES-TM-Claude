"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMember = exports.Project = void 0;
var mongoose_1 = require("mongoose");
var ProjectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    client_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    primary_manager_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active'
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: false
    },
    budget: {
        type: Number,
        min: 0,
        required: false
    },
    description: {
        type: String,
        trim: true,
        required: false
    },
    is_billable: {
        type: Boolean,
        default: true
    },
    approval_settings: {
        type: {
            lead_approval_auto_escalates: {
                type: Boolean,
                default: false
            }
        },
        required: false,
        default: function () { return ({ lead_approval_auto_escalates: false }); }
    },
    deleted_at: {
        type: Date,
        required: false
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
var ProjectMemberSchema = new mongoose_1.Schema({
    project_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project_role: {
        type: String,
        enum: ['super_admin', 'management', 'manager', 'lead', 'employee'],
        required: true
    },
    is_primary_manager: {
        type: Boolean,
        default: false
    },
    is_secondary_manager: {
        type: Boolean,
        default: false
    },
    assigned_at: {
        type: Date,
        default: Date.now
    },
    removed_at: {
        type: Date,
        required: false
    },
    deleted_at: {
        type: Date,
        required: false
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
// Indexes
ProjectSchema.index({ client_id: 1 });
ProjectSchema.index({ primary_manager_id: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ deleted_at: 1 });
ProjectMemberSchema.index({ project_id: 1 });
ProjectMemberSchema.index({ user_id: 1 });
ProjectMemberSchema.index({ project_role: 1 });
ProjectMemberSchema.index({ deleted_at: 1 });
ProjectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });
// Virtuals for ID as string
ProjectSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
});
ProjectMemberSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
});
ProjectSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
ProjectMemberSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
exports.Project = mongoose_1.default.models.Project || mongoose_1.default.model('Project', ProjectSchema);
exports.ProjectMember = mongoose_1.default.models.ProjectMember || mongoose_1.default.model('ProjectMember', ProjectMemberSchema);
exports.default = exports.Project;
