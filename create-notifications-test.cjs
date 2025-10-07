// Test script to create notifications using the backend service
const path = require("path");

// Add the backend src to path for imports
require("ts-node/register");
require("module-alias/register");

const {
  NotificationService,
} = require("./backend/src/services/NotificationService");
const { connectDB } = require("./backend/src/config/database");

async function createTestNotifications() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database successfully");

    const employee1Id = "68df77ec2ba674aa3c8cd2bd"; // employee1@company.com

    // Create welcome notification
    const welcomeNotification = await NotificationService.createNotification({
      recipient_id: employee1Id,
      title: "Welcome to Notifications!",
      message:
        "The notification system is now working. You should see this notification in your notification bell.",
      type: "info",
      priority: "medium",
      action_url: "dashboard|",
    });

    console.log("Welcome notification created:", welcomeNotification._id);

    // Create timesheet approval notification
    const timesheetNotification =
      await NotificationService.createTimesheetApprovedNotification(
        employee1Id,
        "test_timesheet_123",
        null // approver (system)
      );

    console.log("Timesheet notification created:", timesheetNotification._id);

    // Create task assignment notification
    const taskNotification =
      await NotificationService.createTaskAssignmentNotification(
        employee1Id,
        "Frontend Development",
        "Bug Fix Sprint",
        null // assigner (system)
      );

    console.log("Task notification created:", taskNotification._id);

    // Create pending approval notification
    const pendingNotification = await NotificationService.createNotification({
      recipient_id: employee1Id,
      title: "Pending Task Alert",
      message:
        "You have pending tasks that require attention. Please check your task list.",
      type: "warning",
      priority: "high",
      action_url: "projects|project-tasks",
    });

    console.log("Pending notification created:", pendingNotification._id);

    console.log("\n✅ All test notifications created successfully!");
    console.log("Now check the frontend notification bell to see them.");
  } catch (error) {
    console.error("❌ Error creating notifications:", error);
  } finally {
    process.exit(0);
  }
}

createTestNotifications();
