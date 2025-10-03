const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas (simplified)
const timesheetSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  week_start_date: Date,
  week_end_date: Date,
  total_hours: Number,
  status: String,
  submitted_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const Timesheet = mongoose.model("Timesheet", timesheetSchema, "timesheets");

async function createSampleTimesheets() {
  try {
    console.log("Creating sample timesheet data...");

    // Find the employee user
    const User = mongoose.model("User", new mongoose.Schema({}), "users");
    const employee = await User.findOne({ email: "employee1@company.com" });

    if (!employee) {
      console.log("❌ Employee not found");
      return;
    }

    console.log("✅ Found employee:", employee.full_name);

    // Create sample timesheets for October 2024
    const sampleTimesheets = [
      {
        user_id: employee._id,
        week_start_date: new Date("2024-10-01"),
        week_end_date: new Date("2024-10-07"),
        total_hours: 40,
        status: "approved",
        submitted_at: new Date("2024-10-08"),
        created_at: new Date("2024-10-01"),
        updated_at: new Date("2024-10-08"),
      },
      {
        user_id: employee._id,
        week_start_date: new Date("2024-10-08"),
        week_end_date: new Date("2024-10-14"),
        total_hours: 38.5,
        status: "submitted",
        submitted_at: new Date("2024-10-15"),
        created_at: new Date("2024-10-08"),
        updated_at: new Date("2024-10-15"),
      },
      {
        user_id: employee._id,
        week_start_date: new Date("2024-10-15"),
        week_end_date: new Date("2024-10-21"),
        total_hours: 42,
        status: "approved",
        submitted_at: new Date("2024-10-22"),
        created_at: new Date("2024-10-15"),
        updated_at: new Date("2024-10-22"),
      },
      {
        user_id: employee._id,
        week_start_date: new Date("2024-10-22"),
        week_end_date: new Date("2024-10-28"),
        total_hours: 36,
        status: "draft",
        submitted_at: null,
        created_at: new Date("2024-10-22"),
        updated_at: new Date("2024-10-28"),
      },
    ];

    // Clear existing timesheets for this user in October 2024
    await Timesheet.deleteMany({
      user_id: employee._id,
      created_at: {
        $gte: new Date("2024-10-01"),
        $lte: new Date("2024-10-31"),
      },
    });

    // Insert new sample data
    const result = await Timesheet.insertMany(sampleTimesheets);
    console.log(`✅ Created ${result.length} sample timesheets`);

    // Verify data
    const count = await Timesheet.countDocuments({
      user_id: employee._id,
      created_at: {
        $gte: new Date("2024-10-01"),
        $lte: new Date("2024-10-31"),
      },
    });

    console.log(
      `📊 Total timesheets for ${employee.full_name} in Oct 2024: ${count}`
    );
  } catch (error) {
    console.error("❌ Error creating sample data:", error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleTimesheets();
