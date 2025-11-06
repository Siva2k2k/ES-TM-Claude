const mongoose = require("mongoose");
require("dotenv").config();

// Define the intents that need fixes (extracted from intentDefinitions.ts)
const intentsToFix = [
  {
    intent: "create_project",
    fieldTypes: {
      projectName: "string",
      description: "string",
      clientName: "reference",
      managerName: "reference",
      startDate: "date",
      endDate: "date",
      status: "enum",
      budget: "number",
    },
    referenceTypes: {
      clientName: "client",
      managerName: "manager",
    },
    enumValues: {
      status: ["Active", "Completed", "Archived"],
    },
  },
  {
    intent: "add_project_member",
    fieldTypes: {
      projectName: "reference",
      role: "enum",
      name: "reference",
    },
    referenceTypes: {
      projectName: "project",
      name: "user",
    },
    enumValues: {
      role: ["Employee", "Lead"], // Only Employee and Lead roles allowed
    },
  },
  {
    intent: "remove_project_member",
    fieldTypes: {
      projectName: "reference",
      role: "enum",
      name: "reference",
    },
    referenceTypes: {
      projectName: "project",
      name: "user",
    },
    enumValues: {
      role: ["Employee", "Lead"], // Only Employee and Lead roles allowed
    },
  },
  {
    intent: "add_task",
    fieldTypes: {
      projectName: "reference",
      taskName: "string",
      assignedMemberName: "reference",
      description: "string",
      estimatedHours: "number",
      status: "enum",
      isBillable: "boolean",
    },
    referenceTypes: {
      projectName: "project",
      assignedMemberName: "projectMember",
    },
    enumValues: {
      status: ["Open", "InProgress", "Completed"],
    },
  },
  {
    intent: "update_project",
    fieldTypes: {
      projectName: "reference",
      managerName: "reference",
      description: "string",
      clientName: "reference",
      startDate: "date",
      endDate: "date",
      status: "enum",
      budget: "number",
    },
    referenceTypes: {
      projectName: "project",
      managerName: "manager",
      clientName: "client",
    },
    enumValues: {
      status: ["Active", "Completed", "Archived"],
    },
  },
  {
    intent: "update_task",
    fieldTypes: {
      projectName: "reference",
      taskName: "reference",
      assignedMemberName: "reference",
      description: "string",
      estimatedHours: "number",
      status: "enum",
    },
    referenceTypes: {
      projectName: "project",
      taskName: "task",
      assignedMemberName: "projectMember",
    },
    enumValues: {
      status: ["Open", "InProgress", "Completed"],
    },
  },
  {
    intent: "delete_project",
    fieldTypes: {
      projectName: "reference",
      managerName: "reference",
      reason: "string",
    },
    referenceTypes: {
      projectName: "project",
      managerName: "manager",
    },
  },
  {
    intent: "create_user",
    fieldTypes: {
      userName: "string",
      email: "string",
      role: "enum",
      hourlyRate: "number",
    },
    enumValues: {
      role: ["Management", "Manager", "Lead", "Employee"],
    },
  },
  {
    intent: "update_user",
    fieldTypes: {
      userName: "reference",
      email: "string",
      role: "enum",
      hourlyRate: "number",
    },
    referenceTypes: {
      userName: "user",
    },
    enumValues: {
      role: ["Management", "Manager", "Lead", "Employee"],
    },
  },
  {
    intent: "delete_user",
    fieldTypes: {
      userName: "reference",
      role: "enum",
      reason: "string",
    },
    referenceTypes: {
      userName: "user",
    },
    enumValues: {
      role: ["Management", "Manager", "Lead", "Employee"],
    },
  },
  {
    intent: "update_client",
    fieldTypes: {
      clientName: "reference",
      contactPerson: "string",
      contactEmail: "string",
      isActive: "boolean",
    },
    referenceTypes: {
      clientName: "client",
    },
  },
  {
    intent: "delete_client",
    fieldTypes: {
      clientName: "reference",
      reason: "string",
    },
    referenceTypes: {
      clientName: "client",
    },
  },
  {
    intent: "create_timesheet",
    fieldTypes: {
      weekStart: "date",
      weekEnd: "date",
    },
  },
  {
    intent: "add_entries",
    fieldTypes: {
      projectName: "reference",
      taskName: "reference",
      taskType: "enum",
      date: "date",
      hours: "number",
      description: "string",
      entryType: "enum",
    },
    referenceTypes: {
      projectName: "project",
      taskName: "task",
    },
    enumValues: {
      taskType: ["project_task", "custom_task"],
      entryType: ["Project", "Training", "Leave", "Miscellaneous"],
    },
  },
  {
    intent: "update_entries",
    fieldTypes: {
      weekStart: "date",
      projectName: "reference",
      taskName: "reference",
      taskType: "enum",
      date: "date",
      hours: "number",
      description: "string",
      entryType: "enum",
    },
    referenceTypes: {
      projectName: "project",
      taskName: "task",
    },
    enumValues: {
      taskType: ["project_task", "custom_task"],
      entryType: ["Project", "Training", "Leave", "Miscellaneous"],
    },
  },
  {
    intent: "delete_timesheet",
    fieldTypes: {
      weekStart: "date",
    },
  },
  {
    intent: "delete_entries",
    fieldTypes: {
      weekStart: "date",
      projectName: "reference",
      taskName: "reference",
    },
    referenceTypes: {
      projectName: "project",
      taskName: "task",
    },
  },
  {
    intent: "copy_entry",
    fieldTypes: {
      projectName: "reference",
      taskName: "reference",
      taskType: "enum",
      date: "date",
      weekDates: "array",
      entryType: "enum",
    },
    referenceTypes: {
      projectName: "project",
      taskName: "task",
    },
    enumValues: {
      taskType: ["project_task", "custom_task"],
      entryType: ["Project", "Training", "Leave", "Miscellaneous"],
    },
  },
  {
    intent: "approve_user",
    fieldTypes: {
      weekStart: "date",
      weekEnd: "date",
      userName: "reference",
      projectName: "reference",
    },
    referenceTypes: {
      userName: "user",
      projectName: "project",
    },
  },
  {
    intent: "approve_project_week",
    fieldTypes: {
      weekStart: "date",
      weekEnd: "date",
      projectName: "reference",
    },
    referenceTypes: {
      projectName: "project",
    },
  },
  {
    intent: "reject_user",
    fieldTypes: {
      weekStart: "date",
      weekEnd: "date",
      userName: "reference",
      projectName: "reference",
      reason: "string",
    },
    referenceTypes: {
      userName: "user",
      projectName: "project",
    },
  },
  {
    intent: "reject_project_week",
    fieldTypes: {
      weekStart: "date",
      weekEnd: "date",
      projectName: "reference",
      reason: "string",
    },
    referenceTypes: {
      projectName: "project",
    },
  },
  {
    intent: "send_reminder",
    fieldTypes: {
      weekStart: "date",
      weekEnd: "date",
      projectName: "reference",
    },
    referenceTypes: {
      projectName: "project",
    },
  },
  {
    intent: "export_project_billing",
    fieldTypes: {
      startDate: "date",
      endDate: "date",
      projectName: "string",
      clientName: "string",
      format: "enum",
    },
    enumValues: {
      format: ["CSV", "PDF", "Excel"],
    },
  },
  {
    intent: "export_user_billing",
    fieldTypes: {
      startDate: "date",
      endDate: "date",
      userName: "string",
      clientName: "string",
      format: "enum",
    },
    enumValues: {
      format: ["CSV", "PDF", "Excel"],
    },
  },
  {
    intent: "get_audit_logs",
    fieldTypes: {
      startDate: "date",
      endDate: "date",
      needExport: "boolean",
    },
  },
];

const fixAllIntentDefinitions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const IntentDefinition = mongoose.model(
      "IntentDefinition",
      new mongoose.Schema({}, { strict: false })
    );

    console.log("Starting comprehensive intent definition fixes...");
    console.log(`Processing ${intentsToFix.length} intent definitions`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const intentDef of intentsToFix) {
      const { intent, fieldTypes, referenceTypes, enumValues } = intentDef;

      // Check if this intent has reference types or other special field types
      const hasReferenceTypes =
        referenceTypes && Object.keys(referenceTypes).length > 0;
      const hasEnumValues = enumValues && Object.keys(enumValues).length > 0;
      const hasSpecialFields = Object.values(fieldTypes || {}).some((type) =>
        ["reference", "enum", "date", "boolean", "array"].includes(type)
      );

      if (!hasReferenceTypes && !hasEnumValues && !hasSpecialFields) {
        console.log(`⏭️  Skipping ${intent} - no special field types`);
        skippedCount++;
        continue;
      }

      // Find the current intent in database
      const currentIntent = await IntentDefinition.findOne({ intent });

      if (!currentIntent) {
        console.log(`❌ Intent ${intent} not found in database`);
        continue;
      }

      // Check if update is needed
      let needsUpdate = false;
      const updates = {};

      // Check fieldTypes
      if (fieldTypes) {
        const currentFieldTypes = currentIntent.fieldTypes || {};
        const newFieldTypes = fieldTypes;

        let fieldTypesChanged = false;
        for (const [field, expectedType] of Object.entries(newFieldTypes)) {
          if (currentFieldTypes[field] !== expectedType) {
            fieldTypesChanged = true;
            break;
          }
        }

        if (fieldTypesChanged) {
          updates.fieldTypes = newFieldTypes;
          needsUpdate = true;
        }
      }

      // Check referenceTypes
      if (hasReferenceTypes) {
        const currentReferenceTypes = currentIntent.referenceTypes || {};
        const newReferenceTypes = referenceTypes;

        let referenceTypesChanged = false;

        // Check if reference types are missing or different
        for (const [field, refType] of Object.entries(newReferenceTypes)) {
          if (currentReferenceTypes[field] !== refType) {
            referenceTypesChanged = true;
            break;
          }
        }

        // Check if current has extra reference types
        for (const field of Object.keys(currentReferenceTypes)) {
          if (!(field in newReferenceTypes)) {
            referenceTypesChanged = true;
            break;
          }
        }

        if (
          referenceTypesChanged ||
          Object.keys(currentReferenceTypes).length === 0
        ) {
          updates.referenceTypes = newReferenceTypes;
          needsUpdate = true;
        }
      }

      // Check enumValues
      if (hasEnumValues) {
        const currentEnumValues = currentIntent.enumValues || {};
        const newEnumValues = enumValues;

        let enumValuesChanged = false;
        for (const [field, values] of Object.entries(newEnumValues)) {
          const currentValues = currentEnumValues[field];
          if (
            !currentValues ||
            currentValues.length !== values.length ||
            !values.every((v) => currentValues.includes(v))
          ) {
            enumValuesChanged = true;
            break;
          }
        }

        if (enumValuesChanged) {
          updates.enumValues = newEnumValues;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        console.log(`🔄 Updating ${intent}:`);

        if (updates.fieldTypes) {
          console.log(`   - fieldTypes: ${JSON.stringify(updates.fieldTypes)}`);
        }
        if (updates.referenceTypes) {
          console.log(
            `   - referenceTypes: ${JSON.stringify(updates.referenceTypes)}`
          );
        }
        if (updates.enumValues) {
          console.log(`   - enumValues: ${JSON.stringify(updates.enumValues)}`);
        }

        await IntentDefinition.updateOne({ intent }, { $set: updates });

        updatedCount++;
        console.log(`✅ Updated ${intent} successfully`);
      } else {
        console.log(`✅ ${intent} already up to date`);
        skippedCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total intents processed: ${intentsToFix.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (no changes needed): ${skippedCount}`);
    console.log("\n🎉 All intent definitions have been verified and updated!");

    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error fixing intent definitions:", error);
    mongoose.disconnect();
    process.exit(1);
  }
};

fixAllIntentDefinitions();
