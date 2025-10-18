"use strict";
/**
 * Phase 7: Approval History Model
 * Tracks timeline of all approval/rejection actions for timesheets
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalHistory = void 0;
var mongoose_1 = require("mongoose");
var ApprovalHistorySchema = new mongoose_1.Schema({
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
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Approver details
    approver_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approver_role: {
        type: String,
        enum: ['lead', 'manager', 'management', 'super_admin'],
        required: true
    },
    // Action details
    action: {
        type: String,
        enum: ['approved', 'rejected', 'verified', 'billed'],
        required: true
    },
    status_before: {
        type: String,
        enum: [
            'draft',
            'submitted',
            'manager_approved',
            'manager_rejected',
            'management_pending',
            'management_rejected',
            'frozen',
            'billed'
        ],
        required: true
    },
    status_after: {
        type: String,
        enum: [
            'draft',
            'submitted',
            'manager_approved',
            'manager_rejected',
            'management_pending',
            'management_rejected',
            'frozen',
            'billed'
        ],
        required: true
    },
    // Optional reason (for rejections)
    reason: {
        type: String,
        trim: true,
        maxlength: 500,
        required: false
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false // No updates, this is append-only
    }
});
// Indexes for efficient queries
ApprovalHistorySchema.index({ timesheet_id: 1, created_at: -1 });
ApprovalHistorySchema.index({ user_id: 1, created_at: -1 });
ApprovalHistorySchema.index({ approver_id: 1, created_at: -1 });
ApprovalHistorySchema.index({ project_id: 1, created_at: -1 });
// Compound index for user's approval history
ApprovalHistorySchema.index({
    user_id: 1,
    timesheet_id: 1,
    created_at: -1
});
// Virtual for ID as string
ApprovalHistorySchema.virtual('id').get(function () {
    // Ensure correct typing for TypeScript
    return this._id.toHexString();
});
ApprovalHistorySchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
var ApprovalHistory = mongoose_1.default.models.ApprovalHistory ||
    mongoose_1.default.model('ApprovalHistory', ApprovalHistorySchema);
exports.ApprovalHistory = ApprovalHistory;
exports.default = ApprovalHistory;
