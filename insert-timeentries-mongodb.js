const { MongoClient, ObjectId } = require("mongodb");
const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";
const MONGODB_URI =
  "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin";

async function insertTimeEntriesAndTestBilling() {
  console.log("🔗 CONNECTING TO MONGODB AND INSERTING TIME ENTRIES\n");

  let client;

  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("timesheet-management");
    const timeentriesCollection = db.collection("timeentries");

    // Get API data first
    console.log("\n📊 Getting system data from API...");
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Check existing timeentries count
    const existingCount = await timeentriesCollection.countDocuments();
    console.log(`📝 Existing timeentries in database: ${existingCount}`);

    // Define the TimeEntry documents to insert (using your exact structure)
    const timeEntries = [
      {
        timesheet_id: new ObjectId("68df91f428de86e2db82e0a0"),
        project_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        task_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"), // Using project_id as task_id for now
        date: new Date("2024-10-16T00:00:00.000Z"),
        hours: 8,
        description: "Frontend development work",
        is_billable: true,
        entry_type: "project_task",
        created_at: new Date(),
        updated_at: new Date(),
        __v: 0,
      },
      {
        timesheet_id: new ObjectId("68df91f428de86e2db82e0a0"),
        project_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        task_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        date: new Date("2024-10-17T00:00:00.000Z"),
        hours: 7,
        description: "Backend API implementation",
        is_billable: true,
        entry_type: "project_task",
        created_at: new Date(),
        updated_at: new Date(),
        __v: 0,
      },
      {
        timesheet_id: new ObjectId("68df91f428de86e2db82e0a0"),
        project_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        task_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        date: new Date("2024-10-18T00:00:00.000Z"),
        hours: 6,
        description: "Testing and debugging",
        is_billable: false, // Non-billable day
        entry_type: "project_task",
        created_at: new Date(),
        updated_at: new Date(),
        __v: 0,
      },
      {
        timesheet_id: new ObjectId("68df91f428de86e2db82e0a0"),
        project_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        task_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        date: new Date("2024-10-19T00:00:00.000Z"),
        hours: 8,
        description: "Code review and refactoring",
        is_billable: true,
        entry_type: "project_task",
        created_at: new Date(),
        updated_at: new Date(),
        __v: 0,
      },
      {
        timesheet_id: new ObjectId("68df91f428de86e2db82e0a0"),
        project_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        task_id: new ObjectId("68df77ec2ba674aa3c8cd2c7"),
        date: new Date("2024-10-20T00:00:00.000Z"),
        hours: 8,
        description: "Documentation and deployment",
        is_billable: true,
        entry_type: "project_task",
        created_at: new Date(),
        updated_at: new Date(),
        __v: 0,
      },
    ];

    console.log(`\n🌱 Inserting ${timeEntries.length} time entries...`);
    console.log("📋 Summary:");
    console.log(
      `   Timesheet: 68df91f428de86e2db82e0a0 (employee1, week 2024-10-15)`
    );
    console.log(`   Project: 68df77ec2ba674aa3c8cd2c7 (Website Redesign)`);
    console.log(
      `   Total Hours: ${timeEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0
      )}`
    );
    console.log(
      `   Billable Hours: ${timeEntries
        .filter((e) => e.is_billable)
        .reduce((sum, entry) => sum + entry.hours, 0)}`
    );

    // Insert the documents
    const insertResult = await timeentriesCollection.insertMany(timeEntries);
    console.log(
      `✅ Successfully inserted ${insertResult.insertedCount} time entries`
    );

    // Verify insertion
    const newCount = await timeentriesCollection.countDocuments();
    console.log(`📝 Total timeentries now: ${newCount} (was ${existingCount})`);

    // Show inserted entries
    const insertedEntries = await timeentriesCollection
      .find({
        timesheet_id: new ObjectId("68df91f428de86e2db82e0a0"),
      })
      .toArray();

    console.log(
      `\n📋 Inserted entries for timesheet 68df91f428de86e2db82e0a0:`
    );
    insertedEntries.forEach((entry, index) => {
      console.log(
        `   ${index + 1}. ${entry.date.toISOString().split("T")[0]} - ${
          entry.hours
        }h - ${entry.description} (Billable: ${entry.is_billable})`
      );
    });

    console.log("\n💰 TESTING BILLING AFTER INSERTION:");

    // Test project billing
    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-10-31`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const data = billingResponse.data.data;
      console.log(`\n✅ PROJECT BILLING RESULTS:`);
      console.log(`   Projects: ${data.projects?.length || 0}`);
      console.log(`   Total Hours: ${data.summary?.total_hours || 0}`);
      console.log(
        `   Billable Hours: ${data.summary?.total_billable_hours || 0}`
      );
      console.log(`   Total Amount: $${data.summary?.total_amount || 0}`);

      if (data.summary?.total_hours > 0) {
        console.log("\n🎉 SUCCESS! Billing now shows actual data!");

        data.projects?.forEach((project) => {
          if (project.total_hours > 0) {
            console.log(`\n📊 ${project.project_name}:`);
            console.log(
              `   Hours: ${project.total_hours} (${project.billable_hours} billable)`
            );
            console.log(`   Amount: $${project.total_amount}`);
            console.log(`   Resources: ${project.resources?.length || 0}`);

            if (project.resources?.length > 0) {
              project.resources.forEach((resource) => {
                console.log(
                  `   └─ ${resource.user_name}: ${resource.total_hours}h = $${resource.total_amount} (Rate: $${resource.hourly_rate}/hr)`
                );
              });
            }
          }
        });
      } else {
        console.log("\n❌ Still showing 0 - aggregation may need debugging");
      }
    } catch (billingError) {
      console.log(
        "❌ Billing test failed:",
        billingError.response?.data || billingError.message
      );
    }

    // Test task billing too
    try {
      const taskBillingResponse = await axios.get(
        `${API_BASE}/project-billing/tasks?startDate=2024-10-01&endDate=2024-10-31`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const taskData = taskBillingResponse.data.data;
      console.log(`\n✅ TASK BILLING RESULTS:`);
      console.log(`   Tasks: ${taskData.tasks?.length || 0}`);
      console.log(`   Total Hours: ${taskData.summary?.total_hours || 0}`);
      console.log(`   Total Amount: $${taskData.summary?.total_amount || 0}`);

      if (taskData.tasks?.length > 0) {
        console.log("\nTask breakdown:");
        taskData.tasks.slice(0, 5).forEach((task) => {
          console.log(
            `   - ${task.task_name}: ${task.total_hours}h, $${task.total_amount}`
          );
        });
      }
    } catch (taskBillingError) {
      console.log(
        "❌ Task billing test failed:",
        taskBillingError.response?.data || taskBillingError.message
      );
    }
  } catch (error) {
    console.error("❌ Operation failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

insertTimeEntriesAndTestBilling();
