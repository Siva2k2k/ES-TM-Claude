const mongoose = require("mongoose");

// User model schema to understand the structure
const UserSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    full_name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
    },
    department: { type: String },
    hire_date: { type: Date, default: Date.now },
    hourly_rate: { type: Number, default: 0 },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

async function checkUserStructure() {
  try {
    console.log("🔍 Connecting to MongoDB...");
    await mongoose.connect("mongodb://localhost:27017/timesheet-management");

    console.log("👤 Finding employee1...");
    const user = await User.findOne({ email: "employee1@company.com" });

    if (user) {
      console.log("\n📋 User Fields Available:");
      console.log("- first_name:", user.first_name);
      console.log("- last_name:", user.last_name);
      console.log("- full_name:", user.full_name);
      console.log("- email:", user.email);

      console.log("\n🔧 Current user_name logic would produce:");
      console.log(
        "- first_name + last_name:",
        `${user.first_name || "undefined"} ${user.last_name || "undefined"}`
      );
      console.log("- full_name:", user.full_name || "undefined");

      // Show all fields
      console.log("\n📊 Complete user object:");
      console.log(user.toObject());
    } else {
      console.log("❌ User not found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 Connection closed");
  }
}

checkUserStructure();
