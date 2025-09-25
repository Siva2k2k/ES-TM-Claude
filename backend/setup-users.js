const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin";

// User schema - matching the actual backend User model
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "management", "manager", "lead", "employee"],
      default: "employee",
    },
    hourly_rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_approved_by_super_admin: {
      type: Boolean,
      default: false,
    },
    manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    password_hash: {
      type: String,
      required: false,
    },
    deleted_at: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const User = mongoose.model("User", UserSchema);

async function setupInitialUsers() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing users
    await User.deleteMany({});
    console.log("🗑️ Cleared existing users");

    // Create super admin (auto-approved)
    const superAdminPassword = await bcrypt.hash("Admin123!", 10);
    const superAdmin = new User({
      email: "admin@company.com",
      password_hash: superAdminPassword,
      full_name: "System Administrator",
      role: "super_admin",
      hourly_rate: 100,
      is_active: true,
      is_approved_by_super_admin: true, // Super admin approves themselves
    });

    await superAdmin.save();
    console.log("✅ Created Super Admin:", superAdmin.email);

    // Create test employee (needs approval)
    const employeePassword = await bcrypt.hash("Test123!", 10);
    const employee = new User({
      email: "test@company.com",
      password_hash: employeePassword,
      full_name: "Test Employee",
      role: "employee",
      hourly_rate: 25,
      is_active: true,
      is_approved_by_super_admin: true, // Auto-approve for testing
    });

    await employee.save();
    console.log("✅ Created Test Employee:", employee.email);

    // Create test manager
    const managerPassword = await bcrypt.hash("Manager123!", 10);
    const manager = new User({
      email: "manager@company.com",
      password_hash: managerPassword,
      full_name: "Test Manager",
      role: "manager",
      hourly_rate: 50,
      is_active: true,
      is_approved_by_super_admin: true, // Auto-approve for testing
    });

    await manager.save();
    console.log("✅ Created Test Manager:", manager.email);

    console.log("\n🎉 Initial users setup completed!");
    console.log("\nYou can now login with:");
    console.log("📧 Super Admin: admin@company.com / Admin123!");
    console.log("📧 Test Employee: test@company.com / Test123!");
    console.log("📧 Test Manager: manager@company.com / Manager123!");
  } catch (error) {
    console.error("❌ Error setting up users:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

setupInitialUsers();
