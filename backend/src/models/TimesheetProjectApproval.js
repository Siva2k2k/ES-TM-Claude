"use strict";
/**
 * Phase 7: Timesheet Project Approval Model
 * Tracks approval status per project for multi-manager scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimesheetProjectApproval = void 0;
var mongoose_1 = require("mongoose");
var TimesheetProjectApprovalSchema = new mongoose_1.Schema({
    timesheet_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Timesheet',
        required: true,
        index: true
    },
    project_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    // Lead approval fields
    lead_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    lead_status: {
        type: String,
        enum: ['approved', 'rejected', 'pending', 'not_required'],
        default: 'not_required'
    },
    lead_approved_at: {
        type: Date,
        required: false
    },
    lead_rejection_reason: {
        type: String,
        trim: true,
        maxlength: 500,
        required: false
    },
    // Manager approval fields
    manager_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    manager_status: {
        type: String,
        enum: ['approved', 'rejected', 'pending', 'not_required'],
        default: 'pending'
    },
    manager_approved_at: {
        type: Date,
        required: false
    },
    manager_rejection_reason: {
        type: String,
        trim: true,
        maxlength: 500,
        required: false
    },
    // Management verification fields (Tier 3) - NEW
    management_status: {
        type: String,
        enum: ['approved', 'rejected', 'pending', 'not_required'],
        default: 'pending'
    },
    management_approved_at: {
        type: Date,
        required: false
    },
    management_rejection_reason: {
        type: String,
        trim: true,
        maxlength: 500,
        required: false
    },
    // Project time tracking
    entries_count: {
        type: Number,
        default: 0,
        min: 0
    },
    total_hours: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
// Indexes for efficient queries
TimesheetProjectApprovalSchema.index({ timesheet_id: 1, project_id: 1 }, { unique: true });
TimesheetProjectApprovalSchema.index({ manager_id: 1, manager_status: 1 });
TimesheetProjectApprovalSchema.index({ lead_id: 1, lead_status: 1 });
// Compound index for pending approvals
TimesheetProjectApprovalSchema.index({
    manager_status: 1,
    manager_id: 1
}, {
    partialFilterExpression: {
        manager_status: 'pending'
    }
});
// Virtual for ID as string
TimesheetProjectApprovalSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
TimesheetProjectApprovalSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
var TimesheetProjectApproval = mongoose_1.default.models.TimesheetProjectApproval ||
    mongoose_1.default.model('TimesheetProjectApproval', TimesheetProjectApprovalSchema);
exports.TimesheetProjectApproval = TimesheetProjectApproval;
exports.default = TimesheetProjectApproval;
