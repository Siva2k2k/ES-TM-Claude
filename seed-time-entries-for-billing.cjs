const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function seedTimeEntriesForBilling() {
  console.log("🌱 SEEDING TIME ENTRIES FOR EXISTING TIMESHEETS\n");

  try {
    // Login as admin
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Get the data we need
    console.log("📊 Getting system data...");

    const [projectsResponse, usersResponse, timesheetsResponse] =
      await Promise.all([
        axios.get(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_BASE}/timesheets?limit=50`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

    const projects = projectsResponse.data.projects || [];
    const users = usersResponse.data.users || [];
    const timesheets = timesheetsResponse.data.data || [];

    const employee1 = users.find((u) => u.email === "employee1@company.com");

    if (!employee1) {
      console.log("❌ Employee1 not found");
      return;
    }

    if (projects.length === 0) {
      console.log("❌ No projects found");
      return;
    }

    console.log(`✅ Found employee1: ${employee1.full_name} (${employee1.id})`);
    console.log(`✅ Found ${projects.length} projects`);

    // Find employee1's approved/frozen timesheets
    const employee1ApprovedTimesheets = timesheets.filter(
      (ts) =>
        (ts.user_id?._id === employee1.id || ts.user_id === employee1.id) &&
        [
          "frozen",
          "approved",
          "manager_approved",
          "management_approved",
        ].includes(ts.status)
    );

    console.log(
      `✅ Found ${employee1ApprovedTimesheets.length} approved/frozen timesheets for employee1`
    );

    if (employee1ApprovedTimesheets.length === 0) {
      console.log("❌ No approved timesheets to add entries to");
      return;
    }

    // For each approved timesheet, create time entries
    const sampleProject = projects[0]; // Use the first project
    console.log(
      `📋 Using project: ${sampleProject.name} (${sampleProject.id})`
    );

    for (let i = 0; i < employee1ApprovedTimesheets.length; i++) {
      const timesheet = employee1ApprovedTimesheets[i];
      const weekStart = new Date(timesheet.week_start_date);

      console.log(
        `\n📅 Processing timesheet ${i + 1}: Week ${
          weekStart.toISOString().split("T")[0]
        } (${timesheet.status})`
      );
      console.log(`   Timesheet ID: ${timesheet._id}`);

      // Create entries for this week (Monday-Friday)
      const entries = [];
      for (let day = 1; day <= 5; day++) {
        // Monday to Friday
        const entryDate = new Date(weekStart);
        entryDate.setDate(weekStart.getDate() + day);

        const hours = 6 + Math.floor(Math.random() * 3); // 6-8 hours per day
        const isBillable = day !== 3; // Make Wednesday non-billable for variety

        const entry = {
          timesheet_id: timesheet._id,
          project_id: sampleProject.id,
          task_id: null, // Optional
          date: entryDate.toISOString().split("T")[0],
          hours: hours,
          description: `Development work - Day ${day}`,
          is_billable: isBillable,
          entry_type: "project_task",
        };

        entries.push(entry);
        console.log(
          `   📝 Entry ${day}: ${entry.date} - ${entry.hours}h (billable: ${entry.is_billable})`
        );
      }

      // Try to add entries to this timesheet using the API
      try {
        for (const entry of entries) {
          const addEntryResponse = await axios.post(
            `${API_BASE}/timesheets/${timesheet._id}/entries`,
            entry,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );
          console.log(`   ✅ Added entry for ${entry.date}`);
        }

        console.log(
          `   🎉 Successfully added ${entries.length} entries to timesheet`
        );
      } catch (entryError) {
        console.log(
          `   ❌ Failed to add entries via API: ${
            entryError.response?.data?.message || entryError.message
          }`
        );

        // If API doesn't work, we'll note that we need to add them directly to the database
        console.log(
          '   💡 Time entries need to be added directly to MongoDB "timeentries" collection'
        );
        console.log("   📋 Required TimeEntry documents:");
        entries.forEach((entry, idx) => {
          console.log(`     ${idx + 1}. {`);
          console.log(
            `          timesheet_id: ObjectId("${entry.timesheet_id}"),`
          );
          console.log(`          project_id: ObjectId("${entry.project_id}"),`);
          console.log(
            `          date: ISODate("${entry.date}T00:00:00.000Z"),`
          );
          console.log(`          hours: ${entry.hours},`);
          console.log(`          description: "${entry.description}",`);
          console.log(`          is_billable: ${entry.is_billable},`);
          console.log(`          entry_type: "${entry.entry_type}",`);
          console.log(`          deleted_at: null,`);
          console.log(`          created_at: new Date(),`);
          console.log(`          updated_at: new Date()`);
          console.log(`        }`);
        });
      }

      if (i === 0) break; // Just do one timesheet for now to test
    }

    // Test billing after attempting to seed
    console.log("\n💰 TESTING BILLING AFTER SEEDING ATTEMPT:");

    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-09-01&endDate=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const data = billingResponse.data.data;
      console.log(`✅ Billing Response:`);
      console.log(`   Projects: ${data.projects?.length || 0}`);
      console.log(`   Total Hours: ${data.summary?.total_hours || 0}`);
      console.log(
        `   Billable Hours: ${data.summary?.total_billable_hours || 0}`
      );
      console.log(`   Total Amount: $${data.summary?.total_amount || 0}`);

      if (data.summary?.total_hours > 0) {
        console.log("\n🎉 SUCCESS! Time entries are now showing in billing!");

        data.projects?.forEach((project) => {
          if (project.total_hours > 0) {
            console.log(
              `📊 ${project.project_name}: ${project.total_hours}h, $${project.total_amount}`
            );
            if (project.resources?.length > 0) {
              project.resources.forEach((resource) => {
                console.log(
                  `   └─ ${resource.user_name}: ${resource.total_hours}h, $${resource.total_amount}`
                );
              });
            }
          }
        });
      } else {
        console.log("\n❌ Still no billing data");
        console.log("💡 Time entries may need to be added directly to MongoDB");
        console.log(
          "   Use the MongoDB connection to insert TimeEntry documents"
        );
        console.log(
          '   into the "timeentries" collection with the structure shown above'
        );
      }
    } catch (billingError) {
      console.log(
        "❌ Billing test failed:",
        billingError.response?.data || billingError.message
      );
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error.response?.data || error.message);
  }
}

seedTimeEntriesForBilling();
