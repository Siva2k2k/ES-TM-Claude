const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./backend/.env" });

async function addProjectMembers() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("timesheet-management");

    // Get users and projects
    const users = await db.collection("users").find({}).toArray();
    const projects = await db.collection("projects").find({}).toArray();

    const admin = users.find((u) => u.role === "super_admin");
    const manager = users.find((u) => u.role === "manager");
    const employee1 = users.find((u) => u.email === "employee1@company.com");
    const employee2 = users.find((u) => u.email === "employee2@company.com");

    if (projects.length > 0 && employee1 && employee2) {
      // Create project members collection if it doesn't exist
      const projectMembers = [
        {
          project_id: projects[0]._id,
          user_id: employee1._id,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          project_id: projects[1]._id,
          user_id: employee1._id,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          project_id: projects[0]._id,
          user_id: employee2._id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Clear existing project members and add new ones
      await db.collection("projectmembers").deleteMany({});
      await db.collection("projectmembers").insertMany(projectMembers);

      console.log(
        `✅ Added ${projectMembers.length} project member assignments`
      );
      console.log("Project member assignments:");
      projectMembers.forEach((pm) => {
        const user = users.find(
          (u) => u._id.toString() === pm.user_id.toString()
        );
        const project = projects.find(
          (p) => p._id.toString() === pm.project_id.toString()
        );
        console.log(`  - ${user?.full_name} assigned to ${project?.name}`);
      });
    } else {
      console.log("❌ Missing projects or users for assignment");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

addProjectMembers();
