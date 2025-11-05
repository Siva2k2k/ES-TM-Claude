/**
 * Specific User Checker
 *
 * Check a specific user by ID from the JWT token
 */

const mongoose = require("mongoose");
require("dotenv").config();

// User schema
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

async function checkSpecificUser() {
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

    // Check the specific user ID from the JWT token
    const userIdFromToken = "68df77ec2ba674aa3c8cd2bb";

    console.log(`🔍 Searching for user with ID: ${userIdFromToken}`);

    const user = await User.findById(userIdFromToken);

    if (!user) {
      console.log("❌ User NOT FOUND in database!");
      console.log("\n🔍 Searching by email instead...");

      const userByEmail = await User.findOne({ email: "admin@company.com" });

      if (userByEmail) {
        console.log("✅ Found user by email:");
        console.log({
          _id: userByEmail._id.toString(),
          email: userByEmail.email,
          full_name: userByEmail.full_name,
          role: userByEmail.role,
          is_active: userByEmail.is_active,
          is_approved_by_super_admin: userByEmail.is_approved_by_super_admin,
        });
        console.log("\n⚠️  USER ID MISMATCH DETECTED!");
        console.log(`   Token has ID: ${userIdFromToken}`);
        console.log(`   Database has ID: ${userByEmail._id.toString()}`);
        console.log(
          "\n💡 Solution: Clear localStorage and login again to get correct token"
        );
      } else {
        console.log("❌ User not found by email either!");
      }
    } else {
      console.log("✅ User found:");
      console.log({
        _id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin,
        created_at: user.created_at,
      });

      if (user.is_active) {
        console.log("✅ User is ACTIVE - Token should work");
      } else {
        console.log("❌ User is INACTIVE - This explains the error");
      }

      if (user.is_approved_by_super_admin) {
        console.log("✅ User is APPROVED");
      } else {
        console.log("❌ User is NOT APPROVED");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
checkSpecificUser()
  .then(() => {
    console.log("\n✨ Check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Check failed:", error);
    process.exit(1);
  });
