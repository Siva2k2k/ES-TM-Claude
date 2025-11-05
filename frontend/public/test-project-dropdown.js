// Test script to verify project dropdown functionality
// Run this in browser console to test the VoiceConfirmationModal project field rendering

console.log("Testing project field detection...");

// Mock voice action data that would come from the backend
const mockVoiceActions = [
  {
    intent: "add_entries",
    data: {
      projectName: "HVAC Installation",
      taskName: "Code Review",
      date: "2025-11-05",
      hours: 8,
      taskType: "project_task",
      entryType: "Project",
    },
    fields: [
      {
        name: "projectName",
        label: "Project Name",
        type: "string",
        required: true,
      },
      {
        name: "taskName",
        label: "Task Name",
        type: "string",
        required: true,
      },
      {
        name: "date",
        label: "Date",
        type: "date",
        required: true,
      },
      {
        name: "hours",
        label: "Hours",
        type: "number",
        required: true,
      },
    ],
    errors: [],
    description:
      "Add 8 hours to HVAC Installation project for Code Review task on 2025-11-05",
  },
];

// Mock project options that would be fetched from API
const mockProjectOptions = [
  { value: "project1", label: "HVAC Installation" },
  { value: "project2", label: "Project Management" },
  { value: "project3", label: "Software Development" },
  { value: "project4", label: "Client Training" },
];

console.log("Mock Voice Actions:", mockVoiceActions);
console.log("Mock Project Options:", mockProjectOptions);

// Test project field detection logic
function testProjectFieldDetection(fieldName) {
  const isProjectField =
    fieldName === "project_id" ||
    fieldName === "projectName" ||
    fieldName === "project_name" ||
    fieldName === "project" ||
    fieldName.toLowerCase().includes("project");

  console.log(`Field "${fieldName}" is project field:`, isProjectField);
  return isProjectField;
}

// Test various field names
const testFields = [
  "projectName",
  "project_id",
  "project_name",
  "project",
  "taskName",
  "clientName",
  "projectCode",
];
testFields.forEach(testProjectFieldDetection);

console.log("Project field detection test completed!");
