/**
 * User Status Checker and Fixer
 *
 * This script checks and optionally activates user accounts that might be inactive
 */

const mongoose = require("mongoose");
require("dotenv").config();

// User schema (simplified for this script)
const userSchema = new mongoose.Schema({
  email: String,
  full_name: String,
  role: String,
  is_active: Boolean,
  is_approved_by_super_admin: Boolean,
  created_at: Date,
  updated_at: Date,
});

const User = mongoose.model("User", userSchema);

async function checkAndFixUserStatus() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MONGODB_URI not found in environment variables");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get all users
    console.log("\n📋 Checking user accounts...");
    const users = await User.find({}).select(
      "email full_name role is_active is_approved_by_super_admin created_at"
    );

    if (users.length === 0) {
      console.log("❌ No users found in database");
      return;
    }

    console.log(`📊 Found ${users.length} user(s):\n`);

    let inactiveUsers = [];
    let unapprovedUsers = [];

    users.forEach((user, index) => {
      const status = user.is_active ? "✅ Active" : "❌ Inactive";
      const approval = user.is_approved_by_super_admin
        ? "✅ Approved"
        : "❌ Not Approved";

      console.log(`${index + 1}. ${user.full_name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${status}`);
      console.log(`   Approval: ${approval}`);
      console.log(
        `   Created: ${user.created_at?.toDateString() || "Unknown"}`
      );
      console.log("");

      if (!user.is_active) {
        inactiveUsers.push(user);
      }
      if (!user.is_approved_by_super_admin) {
        unapprovedUsers.push(user);
      }
    });

    // Offer to fix inactive users
    if (inactiveUsers.length > 0) {
      console.log(`⚠️  Found ${inactiveUsers.length} inactive user(s):`);
      inactiveUsers.forEach((user) => {
        console.log(`   - ${user.full_name} (${user.email})`);
      });

      // Auto-activate for development (you can modify this logic)
      if (process.env.NODE_ENV === "development") {
        console.log(
          "\n🔧 Development mode detected. Activating all inactive users..."
        );

        const updateResult = await User.updateMany(
          { is_active: false },
          {
            $set: {
              is_active: true,
              updated_at: new Date(),
            },
          }
        );

        console.log(`✅ Activated ${updateResult.modifiedCount} user(s)`);
      } else {
        console.log(
          "\n💡 To activate users manually, run the following MongoDB commands:"
        );
        inactiveUsers.forEach((user) => {
          console.log(
            `   db.users.updateOne({_id: ObjectId("${user._id}")}, {$set: {is_active: true, updated_at: new Date()}})`
          );
        });
      }
    }

    // Offer to approve unapproved users
    if (unapprovedUsers.length > 0) {
      console.log(`\n⚠️  Found ${unapprovedUsers.length} unapproved user(s):`);
      unapprovedUsers.forEach((user) => {
        console.log(`   - ${user.full_name} (${user.email})`);
      });

      // Auto-approve for development (you can modify this logic)
      if (process.env.NODE_ENV === "development") {
        console.log(
          "\n🔧 Development mode detected. Approving all unapproved users..."
        );

        const updateResult = await User.updateMany(
          { is_approved_by_super_admin: false },
          {
            $set: {
              is_approved_by_super_admin: true,
              updated_at: new Date(),
            },
          }
        );

        console.log(`✅ Approved ${updateResult.modifiedCount} user(s)`);
      } else {
        console.log(
          "\n💡 To approve users manually, run the following MongoDB commands:"
        );
        unapprovedUsers.forEach((user) => {
          console.log(
            `   db.users.updateOne({_id: ObjectId("${user._id}")}, {$set: {is_approved_by_super_admin: true, updated_at: new Date()}})`
          );
        });
      }
    }

    if (inactiveUsers.length === 0 && unapprovedUsers.length === 0) {
      console.log("🎉 All users are active and approved!");
    }

    // Check final status
    console.log("\n📋 Final user status:");
    const finalUsers = await User.find({}).select(
      "email full_name is_active is_approved_by_super_admin"
    );
    finalUsers.forEach((user, index) => {
      const status =
        user.is_active && user.is_approved_by_super_admin
          ? "✅ Ready"
          : "❌ Issues";
      console.log(`${index + 1}. ${user.full_name} - ${status}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
checkAndFixUserStatus()
  .then(() => {
    console.log("\n✨ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
