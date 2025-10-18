"use strict";
/**
 * Phase 7: Team Review Approval Service
 * Handles approve/reject/verify/bill operations with multi-manager logic
 * SonarQube compliant - kept under 250 lines
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamReviewApprovalService = void 0;
var mongoose_1 = require("mongoose");
var Timesheet_1 = require("../models/Timesheet");
var TimesheetProjectApproval_1 = require("../models/TimesheetProjectApproval");
var ApprovalHistory_1 = require("../models/ApprovalHistory");
var Project_1 = require("../models/Project");
var logger_1 = require("../config/logger");
// Allowed timesheet statuses (must match Timesheet model)
var ALLOWED_STATUSES = new Set([
    'draft',
    'submitted',
    'manager_approved',
    'manager_rejected',
    'management_pending',
    'management_rejected',
    'frozen',
    'billed'
]);
function normalizeTimesheetStatus(status) {
    if (typeof status === 'string' && ALLOWED_STATUSES.has(status))
        return status;
    // Map legacy or unexpected statuses to a safe default
    if (status === 'pending')
        return 'submitted';
    return 'draft';
}
var TeamReviewApprovalService = /** @class */ (function () {
    function TeamReviewApprovalService() {
    }
    /**
     * Approve timesheet for a specific project
     * Multi-manager logic: Status updates only when ALL managers approve
     */
    TeamReviewApprovalService.approveTimesheetForProject = function (timesheetId, projectId, approverId, approverRole) {
        return __awaiter(this, void 0, void 0, function () {
            var USE_TRANSACTIONS, session, _a, queryOpts, timesheet, projectApproval, statusBefore, project, autoEscalate, timesheetUser, timesheetUserRole, newStatus, allLeadsApproved, allManagersApproved, canApprove, allManagersApproved, canVerify, error_1;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
                        if (!USE_TRANSACTIONS) return [3 /*break*/, 2];
                        return [4 /*yield*/, mongoose_1.default.startSession()];
                    case 1:
                        _a = _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = null;
                        _d.label = 3;
                    case 3:
                        session = _a;
                        if (session)
                            session.startTransaction();
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 28, 31, 32]);
                        queryOpts = session ? { session: session } : {};
                        return [4 /*yield*/, Timesheet_1.Timesheet.findById(timesheetId, null, queryOpts)];
                    case 5:
                        timesheet = _d.sent();
                        if (!timesheet) {
                            throw new Error('Timesheet not found');
                        }
                        return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.findOne({
                                timesheet_id: new mongoose_1.default.Types.ObjectId(timesheetId),
                                project_id: new mongoose_1.default.Types.ObjectId(projectId)
                            }, null, queryOpts)];
                    case 6:
                        projectApproval = _d.sent();
                        if (!projectApproval) {
                            throw new Error('Project approval record not found');
                        }
                        statusBefore = timesheet.status;
                        return [4 /*yield*/, Project_1.Project.findById(projectId, null, queryOpts)];
                    case 7:
                        project = _d.sent();
                        autoEscalate = ((_b = project === null || project === void 0 ? void 0 : project.approval_settings) === null || _b === void 0 ? void 0 : _b.lead_approval_auto_escalates) || false;
                        return [4 /*yield*/, timesheet.populate('user_id')];
                    case 8:
                        timesheetUser = _d.sent();
                        timesheetUserRole = ((_c = timesheetUser.user_id) === null || _c === void 0 ? void 0 : _c.role) || 'employee';
                        newStatus = timesheet.status;
                        if (!(approverRole === 'lead')) return [3 /*break*/, 16];
                        // Validate: Lead can only approve Employee timesheets
                        if (timesheetUserRole !== 'employee') {
                            throw new Error('Lead can only approve Employee timesheets');
                        }
                        // Mark lead approval
                        projectApproval.lead_status = 'approved';
                        projectApproval.lead_approved_at = new Date();
                        projectApproval.lead_rejection_reason = undefined;
                        // If auto-escalation enabled, also mark manager approval
                        if (autoEscalate) {
                            projectApproval.manager_status = 'approved';
                            projectApproval.manager_approved_at = new Date();
                            projectApproval.manager_rejection_reason = undefined;
                        }
                        return [4 /*yield*/, projectApproval.save(queryOpts)];
                    case 9:
                        _d.sent();
                        return [4 /*yield*/, this.checkAllLeadsApproved(timesheetId, session || undefined)];
                    case 10:
                        allLeadsApproved = _d.sent();
                        if (!allLeadsApproved) return [3 /*break*/, 15];
                        if (!autoEscalate) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.checkAllManagersApproved(timesheetId, session || undefined)];
                    case 11:
                        allManagersApproved = _d.sent();
                        if (allManagersApproved) {
                            newStatus = 'manager_approved';
                            timesheet.approved_by_manager_id = new mongoose_1.default.Types.ObjectId(approverId);
                            timesheet.approved_by_manager_at = new Date();
                        }
                        return [3 /*break*/, 13];
                    case 12:
                        // Move to lead_approved status (waiting for manager)
                        newStatus = 'lead_approved';
                        timesheet.approved_by_lead_id = new mongoose_1.default.Types.ObjectId(approverId);
                        timesheet.approved_by_lead_at = new Date();
                        _d.label = 13;
                    case 13:
                        timesheet.status = newStatus;
                        return [4 /*yield*/, timesheet.save(queryOpts)];
                    case 14:
                        _d.sent();
                        _d.label = 15;
                    case 15: return [3 /*break*/, 24];
                    case 16:
                        if (!(approverRole === 'manager' || approverRole === 'super_admin')) return [3 /*break*/, 21];
                        canApprove = (timesheet.status === 'lead_approved' ||
                            (timesheet.status === 'submitted' && ['employee', 'lead', 'manager'].includes(timesheetUserRole)) ||
                            timesheet.status === 'management_rejected');
                        if (!canApprove) {
                            throw new Error("Cannot approve timesheet with status ".concat(timesheet.status, " for user role ").concat(timesheetUserRole));
                        }
                        // Mark manager approval
                        projectApproval.manager_status = 'approved';
                        projectApproval.manager_approved_at = new Date();
                        projectApproval.manager_rejection_reason = undefined;
                        // If approving submitted employee directly, mark that lead was bypassed
                        if (timesheet.status === 'submitted' && timesheetUserRole === 'employee') {
                            projectApproval.lead_status = 'not_required'; // Lead review was bypassed
                            logger_1.logger.info("Manager ".concat(approverId, " directly approved employee timesheet ").concat(timesheetId, ", bypassing lead review"));
                        }
                        return [4 /*yield*/, projectApproval.save(queryOpts)];
                    case 17:
                        _d.sent();
                        return [4 /*yield*/, this.checkAllManagersApproved(timesheetId, session || undefined)];
                    case 18:
                        allManagersApproved = _d.sent();
                        if (!allManagersApproved) return [3 /*break*/, 20];
                        // Check if this is a Manager's own timesheet
                        if (timesheetUserRole === 'manager') {
                            // Manager's timesheet goes to management_pending
                            newStatus = 'management_pending';
                        }
                        else {
                            // Employee/Lead timesheets go to manager_approved
                            newStatus = 'manager_approved';
                        }
                        timesheet.status = newStatus;
                        timesheet.approved_by_manager_id = new mongoose_1.default.Types.ObjectId(approverId);
                        timesheet.approved_by_manager_at = new Date();
                        return [4 /*yield*/, timesheet.save(queryOpts)];
                    case 19:
                        _d.sent();
                        _d.label = 20;
                    case 20: return [3 /*break*/, 24];
                    case 21:
                        if (!(approverRole === 'management')) return [3 /*break*/, 24];
                        canVerify = (timesheet.status === 'manager_approved' ||
                            timesheet.status === 'management_pending');
                        if (!canVerify) {
                            throw new Error("Cannot verify timesheet with status ".concat(timesheet.status));
                        }
                        // Mark management approval
                        projectApproval.management_status = 'approved';
                        projectApproval.management_approved_at = new Date();
                        projectApproval.management_rejection_reason = undefined;
                        return [4 /*yield*/, projectApproval.save(queryOpts)];
                    case 22:
                        _d.sent();
                        // Freeze timesheet
                        newStatus = 'frozen';
                        timesheet.status = newStatus;
                        timesheet.is_frozen = true;
                        timesheet.verified_by_id = new mongoose_1.default.Types.ObjectId(approverId);
                        timesheet.verified_at = new Date();
                        timesheet.approved_by_management_id = new mongoose_1.default.Types.ObjectId(approverId);
                        timesheet.approved_by_management_at = new Date();
                        return [4 /*yield*/, timesheet.save(queryOpts)];
                    case 23:
                        _d.sent();
                        _d.label = 24;
                    case 24: 
                    // Record approval history
                    return [4 /*yield*/, ApprovalHistory_1.ApprovalHistory.create([{
                                timesheet_id: timesheet._id,
                                project_id: new mongoose_1.default.Types.ObjectId(projectId),
                                user_id: timesheet.user_id,
                                approver_id: new mongoose_1.default.Types.ObjectId(approverId),
                                approver_role: approverRole,
                                action: 'approved',
                                status_before: normalizeTimesheetStatus(statusBefore),
                                status_after: normalizeTimesheetStatus(newStatus)
                            }], queryOpts)];
                    case 25:
                        // Record approval history
                        _d.sent();
                        if (!session) return [3 /*break*/, 27];
                        return [4 /*yield*/, session.commitTransaction()];
                    case 26:
                        _d.sent();
                        _d.label = 27;
                    case 27: return [2 /*return*/, {
                            success: true,
                            message: allApprovals
                                ? 'Timesheet approved and status updated'
                                : 'Project approved, waiting for other managers',
                            all_approved: allApprovals,
                            new_status: newStatus
                        }];
                    case 28:
                        error_1 = _d.sent();
                        if (!session) return [3 /*break*/, 30];
                        return [4 /*yield*/, session.abortTransaction()];
                    case 29:
                        _d.sent();
                        _d.label = 30;
                    case 30:
                        logger_1.logger.error('Error approving timesheet:', error_1);
                        throw error_1;
                    case 31:
                        if (session)
                            session.endSession();
                        return [7 /*endfinally*/];
                    case 32: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reject timesheet for a specific project
     * Rejection resets ALL approvals
     */
    TeamReviewApprovalService.rejectTimesheetForProject = function (timesheetId, projectId, approverId, approverRole, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var USE_TRANSACTIONS, session, _a, queryOpts, timesheet, projectApproval, statusBefore, newStatus, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
                        if (!USE_TRANSACTIONS) return [3 /*break*/, 2];
                        return [4 /*yield*/, mongoose_1.default.startSession()];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = null;
                        _b.label = 3;
                    case 3:
                        session = _a;
                        if (session)
                            session.startTransaction();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 23, 26, 27]);
                        queryOpts = session ? { session: session } : {};
                        return [4 /*yield*/, Timesheet_1.Timesheet.findById(timesheetId, null, queryOpts)];
                    case 5:
                        timesheet = _b.sent();
                        if (!timesheet) {
                            throw new Error('Timesheet not found');
                        }
                        return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.findOne({
                                timesheet_id: new mongoose_1.default.Types.ObjectId(timesheetId),
                                project_id: new mongoose_1.default.Types.ObjectId(projectId)
                            }, null, queryOpts)];
                    case 6:
                        projectApproval = _b.sent();
                        if (!projectApproval) {
                            throw new Error('Project approval record not found');
                        }
                        statusBefore = timesheet.status;
                        newStatus = void 0;
                        if (!(approverRole === 'lead')) return [3 /*break*/, 10];
                        projectApproval.lead_status = 'rejected';
                        projectApproval.lead_rejection_reason = reason;
                        return [4 /*yield*/, projectApproval.save(queryOpts)];
                    case 7:
                        _b.sent();
                        // Reset ALL approvals for this timesheet
                        return [4 /*yield*/, this.resetAllApprovals(timesheetId, session || undefined, projectId)];
                    case 8:
                        // Reset ALL approvals for this timesheet
                        _b.sent();
                        // Set timesheet to lead_rejected
                        newStatus = 'lead_rejected';
                        timesheet.status = newStatus;
                        timesheet.lead_rejection_reason = reason;
                        timesheet.lead_rejected_at = new Date();
                        return [4 /*yield*/, timesheet.save(queryOpts)];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 19];
                    case 10:
                        if (!(approverRole === 'manager' || approverRole === 'super_admin')) return [3 /*break*/, 14];
                        projectApproval.manager_status = 'rejected';
                        projectApproval.manager_rejection_reason = reason;
                        return [4 /*yield*/, projectApproval.save(queryOpts)];
                    case 11:
                        _b.sent();
                        // Reset ALL approvals for this timesheet
                        return [4 /*yield*/, this.resetAllApprovals(timesheetId, session || undefined, projectId)];
                    case 12:
                        // Reset ALL approvals for this timesheet
                        _b.sent();
                        // Set timesheet to manager_rejected
                        newStatus = 'manager_rejected';
                        timesheet.status = newStatus;
                        timesheet.manager_rejection_reason = reason;
                        timesheet.manager_rejected_at = new Date();
                        return [4 /*yield*/, timesheet.save(queryOpts)];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 19];
                    case 14:
                        if (!(approverRole === 'management')) return [3 /*break*/, 18];
                        projectApproval.management_status = 'rejected';
                        projectApproval.management_rejection_reason = reason;
                        return [4 /*yield*/, projectApproval.save(queryOpts)];
                    case 15:
                        _b.sent();
                        // Reset ALL approvals for this timesheet
                        return [4 /*yield*/, this.resetAllApprovals(timesheetId, session || undefined, projectId)];
                    case 16:
                        // Reset ALL approvals for this timesheet
                        _b.sent();
                        // Set timesheet to management_rejected
                        newStatus = 'management_rejected';
                        timesheet.status = newStatus;
                        timesheet.management_rejection_reason = reason;
                        timesheet.management_rejected_at = new Date();
                        return [4 /*yield*/, timesheet.save(queryOpts)];
                    case 17:
                        _b.sent();
                        return [3 /*break*/, 19];
                    case 18: throw new Error("Invalid approver role: ".concat(approverRole));
                    case 19: 
                    // Record rejection history
                    return [4 /*yield*/, ApprovalHistory_1.ApprovalHistory.create([{
                                timesheet_id: timesheet._id,
                                project_id: new mongoose_1.default.Types.ObjectId(projectId),
                                user_id: timesheet.user_id,
                                approver_id: new mongoose_1.default.Types.ObjectId(approverId),
                                approver_role: approverRole,
                                action: 'rejected',
                                status_before: normalizeTimesheetStatus(statusBefore),
                                status_after: normalizeTimesheetStatus(newStatus),
                                reason: reason
                            }], queryOpts)];
                    case 20:
                        // Record rejection history
                        _b.sent();
                        if (!session) return [3 /*break*/, 22];
                        return [4 /*yield*/, session.commitTransaction()];
                    case 21:
                        _b.sent();
                        _b.label = 22;
                    case 22: return [2 /*return*/, {
                            success: true,
                            message: 'Timesheet rejected',
                            all_approved: false,
                            new_status: newStatus
                        }];
                    case 23:
                        error_2 = _b.sent();
                        if (!session) return [3 /*break*/, 25];
                        return [4 /*yield*/, session.abortTransaction()];
                    case 24:
                        _b.sent();
                        _b.label = 25;
                    case 25:
                        logger_1.logger.error('Error rejecting timesheet:', error_2);
                        throw error_2;
                    case 26:
                        if (session)
                            session.endSession();
                        return [7 /*endfinally*/];
                    case 27: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if all leads have approved (for employee timesheets)
     */
    TeamReviewApprovalService.checkAllLeadsApproved = function (timesheetId, session) {
        return __awaiter(this, void 0, void 0, function () {
            var approvals, _i, approvals_1, approval;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.find({
                            timesheet_id: new mongoose_1.default.Types.ObjectId(timesheetId)
                        }).session(session)];
                    case 1:
                        approvals = _a.sent();
                        for (_i = 0, approvals_1 = approvals; _i < approvals_1.length; _i++) {
                            approval = approvals_1[_i];
                            // Check lead approval if lead exists
                            if (approval.lead_id && approval.lead_status !== 'approved') {
                                return [2 /*return*/, false];
                            }
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Check if all managers have approved
     */
    TeamReviewApprovalService.checkAllManagersApproved = function (timesheetId, session) {
        return __awaiter(this, void 0, void 0, function () {
            var approvals, _i, approvals_2, approval;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.find({
                            timesheet_id: new mongoose_1.default.Types.ObjectId(timesheetId)
                        }).session(session)];
                    case 1:
                        approvals = _a.sent();
                        for (_i = 0, approvals_2 = approvals; _i < approvals_2.length; _i++) {
                            approval = approvals_2[_i];
                            // Check manager approval (always required)
                            if (approval.manager_status !== 'approved') {
                                return [2 /*return*/, false];
                            }
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Check if all required approvals are complete (legacy method - kept for compatibility)
     */
    TeamReviewApprovalService.checkAllApprovalsComplete = function (timesheetId, session) {
        return __awaiter(this, void 0, void 0, function () {
            var approvals, _i, approvals_3, approval;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.find({
                            timesheet_id: new mongoose_1.default.Types.ObjectId(timesheetId)
                        }).session(session)];
                    case 1:
                        approvals = _a.sent();
                        for (_i = 0, approvals_3 = approvals; _i < approvals_3.length; _i++) {
                            approval = approvals_3[_i];
                            // Check lead approval if required
                            if (approval.lead_id && approval.lead_status !== 'approved') {
                                return [2 /*return*/, false];
                            }
                            // Check manager approval (always required)
                            if (approval.manager_status !== 'approved') {
                                return [2 /*return*/, false];
                            }
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Reset all approvals for a timesheet (used on rejection)
     */
    TeamReviewApprovalService.resetAllApprovals = function (timesheetId, session, 
    // optional project id to exclude from reset (so a rejected approval isn't overwritten)
    excludeProjectId) {
        return __awaiter(this, void 0, void 0, function () {
            var filter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filter = { timesheet_id: new mongoose_1.default.Types.ObjectId(timesheetId) };
                        if (excludeProjectId) {
                            try {
                                filter.project_id = { $ne: new mongoose_1.default.Types.ObjectId(excludeProjectId) };
                            }
                            catch (err) {
                                // if the provided id isn't a valid ObjectId, ignore the exclude
                                // (this preserves previous behavior rather than throwing)
                                logger_1.logger.warn('Invalid excludeProjectId passed to resetAllApprovals:', excludeProjectId);
                            }
                        }
                        return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.updateMany(filter, {
                                $set: {
                                    lead_status: 'pending',
                                    lead_approved_at: null,
                                    manager_status: 'pending',
                                    manager_approved_at: null,
                                    management_status: 'pending',
                                    management_approved_at: null
                                },
                                $unset: {
                                    // keep rejection reasons on the excluded approval; for others clear any previous reasons
                                    lead_rejection_reason: '',
                                    manager_rejection_reason: '',
                                    management_rejection_reason: ''
                                }
                            }, { session: session })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Bulk verify timesheets (Management only)
     */
    TeamReviewApprovalService.bulkVerifyTimesheets = function (timesheetIds, verifierId) {
        return __awaiter(this, void 0, void 0, function () {
            var processedCount, failedCount, _i, timesheetIds_1, timesheetId, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        processedCount = 0;
                        failedCount = 0;
                        _i = 0, timesheetIds_1 = timesheetIds;
                        _a.label = 1;
                    case 1:
                        if (!(_i < timesheetIds_1.length)) return [3 /*break*/, 6];
                        timesheetId = timesheetIds_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Timesheet_1.Timesheet.findByIdAndUpdate(timesheetId, {
                                status: 'frozen',
                                is_frozen: true,
                                verified_by_id: new mongoose_1.default.Types.ObjectId(verifierId),
                                verified_at: new Date()
                            })];
                    case 3:
                        _a.sent();
                        processedCount++;
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        logger_1.logger.error("Failed to verify timesheet ".concat(timesheetId, ":"), error_3);
                        failedCount++;
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, { processed_count: processedCount, failed_count: failedCount }];
                }
            });
        });
    };
    /**
     * Bulk bill timesheets (Management only)
     */
    TeamReviewApprovalService.bulkBillTimesheets = function (timesheetIds, billerId) {
        return __awaiter(this, void 0, void 0, function () {
            var processedCount, failedCount, _i, timesheetIds_2, timesheetId, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        processedCount = 0;
                        failedCount = 0;
                        _i = 0, timesheetIds_2 = timesheetIds;
                        _a.label = 1;
                    case 1:
                        if (!(_i < timesheetIds_2.length)) return [3 /*break*/, 6];
                        timesheetId = timesheetIds_2[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Timesheet_1.Timesheet.findByIdAndUpdate(timesheetId, {
                                status: 'billed'
                            })];
                    case 3:
                        _a.sent();
                        processedCount++;
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _a.sent();
                        logger_1.logger.error("Failed to bill timesheet ".concat(timesheetId, ":"), error_4);
                        failedCount++;
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, { processed_count: processedCount, failed_count: failedCount }];
                }
            });
        });
    };
    /**
     * Bulk approve all timesheets for a project-week
     * Approves all users' timesheets for the specified project and week
     */
    TeamReviewApprovalService.approveProjectWeek = function (projectId, weekStart, weekEnd, approverId, approverRole) {
        return __awaiter(this, void 0, void 0, function () {
            var USE_TRANSACTIONS, session, _a, queryOpts, project, weekStartDate, weekEndDate, timesheets, timesheetIds, projectApprovals, autoEscalate, affectedUsers_1, affectedTimesheetIds_1, _loop_2, this_2, _i, projectApprovals_2, approval, weekLabel;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
                        if (!USE_TRANSACTIONS) return [3 /*break*/, 2];
                        return [4 /*yield*/, mongoose_1.default.startSession()];
                    case 1:
                        _a = _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = null;
                        _d.label = 3;
                    case 3:
                        session = _a;
                        if (session) {
                            session.startTransaction();
                        }
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, , 12, 13]);
                        queryOpts = session ? { session: session } : {};
                        return [4 /*yield*/, Project_1.Project.findById(projectId, null, queryOpts)];
                    case 5:
                        project = _d.sent();
                        if (!project) {
                            throw new Error('Project not found');
                        }
                        weekStartDate = new Date(weekStart);
                        weekEndDate = new Date(weekEnd);
                        return [4 /*yield*/, Timesheet_1.Timesheet.find({
                                week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
                                deleted_at: null
                            }, null, queryOpts)];
                    case 6:
                        timesheets = _d.sent();
                        if (timesheets.length === 0) {
                            throw new Error('No timesheets found for this week');
                        }
                        timesheetIds = timesheets.map(function (t) { return t._id; });
                        return [4 /*yield*/, TimesheetProjectApproval_1.TimesheetProjectApproval.find({
                                timesheet_id: { $in: timesheetIds },
                                project_id: new mongoose_1.default.Types.ObjectId(projectId)
                            }, null, queryOpts)];
                    case 7:
                        projectApprovals = _d.sent();
                        if (projectApprovals.length === 0) {
                            throw new Error('No approval records found for this project-week');
                        }
                        autoEscalate = ((_b = project.approval_settings) === null || _b === void 0 ? void 0 : _b.lead_approval_auto_escalates) || false;
                        affectedUsers_1 = 0;
                        affectedTimesheetIds_1 = new Set();
                        _loop_2 = function (approval) {
                            var timesheet, statusBefore, timesheetUser, timesheetUserRole, newStatus, allLeadsApproved, allManagersApproved, allManagersApproved;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        timesheet = timesheets.find(function (t) { return t._id.toString() === approval.timesheet_id.toString(); });
                                        if (!timesheet)
                                            return [2 /*return*/, "continue"];
                                        statusBefore = timesheet.status;
                                        return [4 /*yield*/, timesheet.populate('user_id')];
                                    case 1:
                                        timesheetUser = _e.sent();
                                        timesheetUserRole = ((_c = timesheetUser.user_id) === null || _c === void 0 ? void 0 : _c.role) || 'employee';
                                        // TIER 1: LEAD APPROVAL
                                        if (approverRole === 'lead') {
                                            // Skip non-employee timesheets
                                            if (timesheetUserRole !== 'employee')
                                                return [2 /*return*/, "continue"];
                                            approval.lead_status = 'approved';
                                            approval.lead_approved_at = new Date();
                                            approval.lead_rejection_reason = undefined;
                                            // If auto-escalation is enabled, also mark manager approval
                                            if (autoEscalate) {
                                                approval.manager_status = 'approved';
                                                approval.manager_approved_at = new Date();
                                                approval.manager_rejection_reason = undefined;
                                            }
                                        }
                                        // TIER 2: MANAGER APPROVAL
                                        else if (approverRole === 'manager' || approverRole === 'super_admin') {
                                            approval.manager_status = 'approved';
                                            approval.manager_approved_at = new Date();
                                            approval.manager_rejection_reason = undefined;
                                        }
                                        // TIER 3: MANAGEMENT VERIFICATION
                                        else if (approverRole === 'management') {
                                            approval.management_status = 'approved';
                                            approval.management_approved_at = new Date();
                                            approval.management_rejection_reason = undefined;
                                        }
                                        return [4 /*yield*/, approval.save(queryOpts)];
                                    case 2:
                                        _e.sent();
                                        newStatus = timesheet.status;
                                        if (!(approverRole === 'lead')) return [3 /*break*/, 7];
                                        return [4 /*yield*/, this_2.checkAllLeadsApproved(approval.timesheet_id.toString(), session || undefined)];
                                    case 3:
                                        allLeadsApproved = _e.sent();
                                        if (!allLeadsApproved) return [3 /*break*/, 6];
                                        if (!autoEscalate) return [3 /*break*/, 5];
                                        return [4 /*yield*/, this_2.checkAllManagersApproved(approval.timesheet_id.toString(), session || undefined)];
                                    case 4:
                                        allManagersApproved = _e.sent();
                                        if (allManagersApproved) {
                                            newStatus = 'manager_approved';
                                            timesheet.approved_by_manager_id = new mongoose_1.default.Types.ObjectId(approverId);
                                            timesheet.approved_by_manager_at = new Date();
                                        }
                                        return [3 /*break*/, 6];
                                    case 5:
                                        newStatus = 'lead_approved';
                                        timesheet.approved_by_lead_id = new mongoose_1.default.Types.ObjectId(approverId);
                                        timesheet.approved_by_lead_at = new Date();
                                        _e.label = 6;
                                    case 6: return [3 /*break*/, 10];
                                    case 7:
                                        if (!(approverRole === 'manager' || approverRole === 'super_admin')) return [3 /*break*/, 9];
                                        return [4 /*yield*/, this_2.checkAllManagersApproved(approval.timesheet_id.toString(), session || undefined)];
                                    case 8:
                                        allManagersApproved = _e.sent();
                                        if (allManagersApproved) {
                                            if (timesheetUserRole === 'manager') {
                                                newStatus = 'management_pending';
                                            }
                                            else {
                                                newStatus = 'manager_approved';
                                            }
                                            timesheet.approved_by_manager_id = new mongoose_1.default.Types.ObjectId(approverId);
                                            timesheet.approved_by_manager_at = new Date();
                                        }
                                        return [3 /*break*/, 10];
                                    case 9:
                                        if (approverRole === 'management') {
                                            newStatus = 'frozen';
                                            timesheet.is_frozen = true;
                                            timesheet.verified_by_id = new mongoose_1.default.Types.ObjectId(approverId);
                                            timesheet.verified_at = new Date();
                                            timesheet.approved_by_management_id = new mongoose_1.default.Types.ObjectId(approverId);
                                            timesheet.approved_by_management_at = new Date();
                                        }
                                        _e.label = 10;
                                    case 10:
                                        if (!(newStatus !== statusBefore)) return [3 /*break*/, 12];
                                        timesheet.status = newStatus;
                                        return [4 /*yield*/, timesheet.save(queryOpts)];
                                    case 11:
                                        _e.sent();
                                        _e.label = 12;
                                    case 12:
                                        affectedTimesheetIds_1.add(timesheet._id.toString());
                                        affectedUsers_1++;
                                        // Record history - use the timesheet's status values so they match ApprovalHistory enum
                                        return [4 /*yield*/, ApprovalHistory_1.ApprovalHistory.create([{
                                                    timesheet_id: timesheet._id,
                                                    project_id: new mongoose_1.default.Types.ObjectId(projectId),
                                                    user_id: timesheet.user_id,
                                                    approver_id: new mongoose_1.default.Types.ObjectId(approverId),
                                                    approver_role: approverRole,
                                                    action: 'approved',
                                                    status_before: normalizeTimesheetStatus(statusBefore),
                                                    status_after: normalizeTimesheetStatus(timesheet.status),
                                                    notes: 'Bulk project-week approval'
                                                }], queryOpts)];
                                    case 13:
                                        // Record history - use the timesheet's status values so they match ApprovalHistory enum
                                        _e.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _i = 0, projectApprovals_2 = projectApprovals;
                        _d.label = 8;
                    case 8:
                        if (!(_i < projectApprovals_2.length)) return [3 /*break*/, 11];
                        approval = projectApprovals_2[_i];
                        return [5 /*yield**/, _loop_2(approval)];
                    case 9:
                        _d.sent();
                        _d.label = 10;
                    case 10:
                        _i++;
                        return [3 /*break*/, 8];
                    case 11: return [3 /*break*/, 13];
                    case 12: return [7 /*endfinally*/];
                    case 13:
                        if (!session) return [3 /*break*/, 15];
                        return [4 /*yield*/, session.commitTransaction()];
                    case 14:
                        _d.sent();
                        _d.label = 15;
                    case 15:
                        weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully approved ".concat(affectedUsers, " user(s) for ").concat(project.name, " - ").concat(weekLabel),
                                affected_users: affectedUsers,
                                affected_timesheets: affectedTimesheetIds.size,
                                project_week: {
                                    project_name: project.name,
                                    week_label: weekLabel
                                }
                            }];
                }
            });
        });
    };
    TeamReviewApprovalService.prototype.catch = function (error) {
        if (session) {
            yield session.abortTransaction();
        }
        logger_1.logger.error('Error bulk approving project-week:', error);
        throw error;
    };
    return TeamReviewApprovalService;
}());
exports.TeamReviewApprovalService = TeamReviewApprovalService;
try { }
finally {
    if (session) {
        session.endSession();
    }
}
async;
rejectProjectWeek(projectId, string, weekStart, string, weekEnd, string, approverId, string, approverRole, string, reason, string);
Promise < teamReview_1.BulkProjectWeekApprovalResponse > {
    const: USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true',
    const: session = USE_TRANSACTIONS ? await mongoose_1.default.startSession() : null,
    if: function (session) {
        session.startTransaction();
    },
    try: {
        const: queryOpts = session ? { session: session } : {},
        // Get project details
        const: project = await Project_1.Project.findById(projectId).session(session),
        if: function (, project) {
            throw new Error('Project not found');
        }
        // Find all timesheets for this week
        ,
        // Find all timesheets for this week
        const: weekStartDate = new Date(weekStart),
        const: weekEndDate = new Date(weekEnd),
        const: timesheets = await Timesheet_1.Timesheet.find({
            week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
            deleted_at: null
        }, null, queryOpts),
        if: function (timesheets) { },
        : .length === 0,
        throw: new Error('No timesheets found for this week')
    },
    const: timesheetIds = timesheets.map(function (t) { return t._id; }),
    // Find all project approvals for these timesheets and this project
    const: projectApprovals = await TimesheetProjectApproval_1.TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose_1.default.Types.ObjectId(projectId)
    }, null, queryOpts),
    if: function (projectApprovals) { },
    : .length === 0,
    throw: new Error('No approval records found for this project-week')
};
var affectedUsers = 0;
var affectedTimesheetIds = new Set();
var _loop_1 = function (approval) {
    // Find the timesheet this approval belongs to and capture its previous status
    var timesheet = timesheets.find(function (t) { return t._id.toString() === approval.timesheet_id.toString(); });
    var statusBefore = timesheet ? timesheet.status : 'draft';
    if (approverRole === 'lead') {
        approval.lead_status = 'rejected';
        approval.lead_rejection_reason = reason;
    }
    else {
        approval.manager_status = 'rejected';
        approval.manager_rejection_reason = reason;
    }
    await approval.save(queryOpts);
    // Reset ALL approvals for this timesheet except the current project approval
    await this_1.resetAllApprovals(approval.timesheet_id.toString(), session || undefined, projectId);
    // Update timesheet status
    if (timesheet) {
        timesheet.status = 'manager_rejected';
        timesheet.manager_rejection_reason = reason;
        timesheet.manager_rejected_at = new Date();
        await timesheet.save(queryOpts);
        affectedTimesheetIds.add(timesheet._id.toString());
        affectedUsers++;
        // Record history - use the timesheet's status values so they match ApprovalHistory enum
        await ApprovalHistory_1.ApprovalHistory.create([{
                timesheet_id: timesheet._id,
                project_id: new mongoose_1.default.Types.ObjectId(projectId),
                user_id: timesheet.user_id,
                approver_id: new mongoose_1.default.Types.ObjectId(approverId),
                approver_role: approverRole,
                action: 'rejected',
                status_before: normalizeTimesheetStatus(statusBefore),
                status_after: normalizeTimesheetStatus('manager_rejected'),
                reason: reason,
                notes: 'Bulk project-week rejection'
            }], queryOpts);
    }
};
var this_1 = this;
// Update all project approvals
for (var _i = 0, projectApprovals_1 = projectApprovals; _i < projectApprovals_1.length; _i++) {
    var approval = projectApprovals_1[_i];
    _loop_1(approval);
}
if (session)
    await session.commitTransaction();
var weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);
return {
    success: true,
    message: "Successfully rejected ".concat(affectedUsers, " user(s) for ").concat(project.name, " - ").concat(weekLabel),
    affected_users: affectedUsers,
    affected_timesheets: affectedTimesheetIds.size,
    project_week: {
        project_name: project.name,
        week_label: weekLabel
    }
};
;
try { }
catch (error) {
    if (session) {
        await session.abortTransaction();
    }
    logger_1.logger.error('Error bulk rejecting project-week:', error);
    throw error;
}
finally {
    if (session) {
        session.endSession();
    }
}
;
/**
 * Bulk freeze all timesheets for a project-week (Management only)
 * Freezes ALL manager_approved timesheets, skips users without timesheets
 * Validation: Cannot freeze if ANY timesheet is still in submitted/pending state
 */
static;
async;
bulkFreezeProjectWeek(projectId, string, weekStart, string, weekEnd, string, managementId, string);
: Promise < {
    success: boolean,
    message: string,
    frozen_count: number,
    skipped_count: number,
    failed: (Array)
} > {
    const: USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true',
    const: session = USE_TRANSACTIONS ? await mongoose_1.default.startSession() : null,
    if: function (session) {
        session.startTransaction();
    },
    try: {
        const: queryOpts = session ? { session: session } : {},
        // Get project details
        const: project = await Project_1.Project.findById(projectId, null, queryOpts),
        if: function (, project) {
            throw new Error('Project not found');
        }
        // Find all timesheets for this week
        ,
        // Find all timesheets for this week
        const: weekStartDate = new Date(weekStart),
        const: weekEndDate = new Date(weekEnd),
        const: timesheets = await Timesheet_1.Timesheet.find({
            week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
            deleted_at: null
        }, null, queryOpts).populate('user_id', 'full_name'),
        if: function (timesheets) { },
        : .length === 0,
        throw: new Error('No timesheets found for this week')
    },
    const: timesheetIds = timesheets.map(function (t) { return t._id; }),
    // Find all project approvals for these timesheets and this project
    const: projectApprovals = await TimesheetProjectApproval_1.TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose_1.default.Types.ObjectId(projectId)
    }, null, queryOpts),
    // Validation: Check if ANY timesheet is still pending approval
    const: pendingTimesheets = timesheets.filter(function (t) {
        return ['submitted', 'manager_rejected', 'management_rejected'].includes(t.status);
    }),
    if: function (pendingTimesheets) { },
    : .length > 0,
    const: pendingUsers = pendingTimesheets
        .map(function (t) { var _a; return ((_a = t.user_id) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unknown'; })
        .join(', '),
    throw: new Error("Cannot freeze project-week: ".concat(pendingTimesheets.length, " timesheet(s) still pending approval (").concat(pendingUsers, ")"))
};
var frozenCount = 0;
var skippedCount = 0;
var failed = [];
// Process each timesheet
for (var _b = 0, timesheets_1 = timesheets; _b < timesheets_1.length; _b++) {
    var timesheet = timesheets_1[_b];
    try {
        // Skip if not manager_approved
        if (timesheet.status !== 'manager_approved') {
            skippedCount++;
            continue;
        }
        // Freeze the timesheet
        timesheet.status = 'frozen';
        timesheet.is_frozen = true;
        timesheet.verified_by_id = new mongoose_1.default.Types.ObjectId(managementId);
        timesheet.verified_at = new Date();
        timesheet.approved_by_management_id = new mongoose_1.default.Types.ObjectId(managementId);
        timesheet.approved_by_management_at = new Date();
        await timesheet.save(queryOpts);
        // Record approval history
        await ApprovalHistory_1.ApprovalHistory.create([{
                timesheet_id: timesheet._id,
                project_id: new mongoose_1.default.Types.ObjectId(projectId),
                user_id: timesheet.user_id,
                approver_id: new mongoose_1.default.Types.ObjectId(managementId),
                approver_role: 'management',
                action: 'approved',
                status_before: 'manager_approved',
                status_after: 'frozen',
                notes: 'Bulk project-week freeze'
            }], queryOpts);
        frozenCount++;
    }
    catch (error) {
        logger_1.logger.error("Failed to freeze timesheet ".concat(timesheet._id, ":"), error);
        failed.push({
            user_id: timesheet.user_id.toString(),
            user_name: ((_a = timesheet.user_id) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unknown',
            reason: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
if (session)
    await session.commitTransaction();
var weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);
return {
    success: true,
    message: "Successfully frozen ".concat(frozenCount, " timesheet(s) for ").concat(project.name, " - ").concat(weekLabel),
    frozen_count: frozenCount,
    skipped_count: skippedCount,
    failed: failed
};
;
try { }
catch (error) {
    if (session) {
        await session.abortTransaction();
    }
    logger_1.logger.error('Error bulk freezing project-week:', error);
    throw error;
}
finally {
    if (session) {
        session.endSession();
    }
}
;
/**
 * Format week label for display
 */
private;
static;
formatWeekLabel(start, Date, end, Date);
: string;
{
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var startMonth = monthNames[start.getMonth()];
    var endMonth = monthNames[end.getMonth()];
    var startDay = start.getDate();
    var endDay = end.getDate();
    var year = start.getFullYear();
    if (startMonth === endMonth) {
        return "".concat(startMonth, " ").concat(startDay, "-").concat(endDay, ", ").concat(year);
    }
    else {
        return "".concat(startMonth, " ").concat(startDay, " - ").concat(endMonth, " ").concat(endDay, ", ").concat(year);
    }
}
;
exports.default = TeamReviewApprovalService;
