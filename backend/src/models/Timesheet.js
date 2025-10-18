"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timesheet = void 0;
var mongoose_1 = require("mongoose");
var TimesheetSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    week_start_date: {
        type: Date,
        required: true
    },
    week_end_date: {
        type: Date,
        required: true
    },
    total_hours: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: [
            'draft',
            'submitted',
            'lead_approved', // NEW: Lead approved employee timesheet
            'lead_rejected', // NEW: Lead rejected employee timesheet
            'manager_approved',
            'manager_rejected',
            'management_pending',
            'management_rejected',
            'frozen',
            'billed'
        ],
        default: 'draft'
    },
    // Lead approval fields (NEW)
    approved_by_lead_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    approved_by_lead_at: {
        type: Date,
        required: false
    },
    lead_rejection_reason: {
        type: String,
        trim: true,
        required: false
    },
    lead_rejected_at: {
        type: Date,
        required: false
    },
    // Manager approval fields
    approved_by_manager_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    approved_by_manager_at: {
        type: Date,
        required: false
    },
    manager_rejection_reason: {
        type: String,
        trim: true,
        required: false
    },
    manager_rejected_at: {
        type: Date,
        required: false
    },
    // Management approval fields
    approved_by_management_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    approved_by_management_at: {
        type: Date,
        required: false
    },
    management_rejection_reason: {
        type: String,
        trim: true,
        required: false
    },
    management_rejected_at: {
        type: Date,
        required: false
    },
    // Verification fields
    verified_by_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    verified_at: {
        type: Date,
        required: false
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_frozen: {
        type: Boolean,
        default: false
    },
    // Billing integration
    billing_snapshot_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: false
    },
    // Submission tracking
    submitted_at: {
        type: Date,
        required: false
    },
    // Delete tracking fields
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
TimesheetSchema.index({ user_id: 1, week_start_date: 1 }, { unique: true });
TimesheetSchema.index({ status: 1 });
TimesheetSchema.index({ week_start_date: -1 });
TimesheetSchema.index({ submitted_at: 1 });
TimesheetSchema.index({ deleted_at: 1 });
// Compound indexes for queries
TimesheetSchema.index({
    status: 1,
    submitted_at: 1
}, {
    partialFilterExpression: {
        status: { $in: ['submitted', 'manager_approved', 'management_pending'] }
    }
});
// Virtual for ID as string
TimesheetSchema.virtual('id').get(function () {
    // Cast to ObjectId for TypeScript safety
    return this._id.toHexString();
});
TimesheetSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
var Timesheet = mongoose_1.default.models.Timesheet || mongoose_1.default.model('Timesheet', TimesheetSchema);
exports.Timesheet = Timesheet;
exports.default = Timesheet;
