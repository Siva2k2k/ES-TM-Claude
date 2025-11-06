const mongoose = require("mongoose");
require("dotenv").config();

const fixCreateProjectIntent = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const IntentDefinition = mongoose.model(
      "IntentDefinition",
      new mongoose.Schema({}, { strict: false })
    );

    // Find the create_project intent
    const createProjectIntent = await IntentDefinition.findOne({
      intent: "create_project",
    });

    if (!createProjectIntent) {
      console.log("create_project intent not found");
      return;
    }

    console.log("Current create_project intent:");
    console.log("fieldTypes:", createProjectIntent.fieldTypes);
    console.log("referenceTypes:", createProjectIntent.referenceTypes);

    // Update the intent with correct field types and reference types
    const updatedFields = {
      fieldTypes: {
        projectName: "string",
        description: "string",
        clientName: "reference", // Fix: was 'string'
        managerName: "reference", // Fix: was 'string'
        startDate: "date",
        endDate: "date",
        status: "enum",
        budget: "number",
      },
      referenceTypes: {
        clientName: "client",
        managerName: "manager",
      },
    };

    await IntentDefinition.updateOne(
      { intent: "create_project" },
      { $set: updatedFields }
    );

    console.log("Updated create_project intent successfully!");

    // Verify the update
    const updatedIntent = await IntentDefinition.findOne({
      intent: "create_project",
    });
    console.log("After update:");
    console.log("fieldTypes:", updatedIntent.fieldTypes);
    console.log("referenceTypes:", updatedIntent.referenceTypes);

    mongoose.disconnect();
  } catch (error) {
    console.error("Error updating intent:", error);
    mongoose.disconnect();
  }
};

fixCreateProjectIntent();
