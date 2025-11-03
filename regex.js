// Utility to expand "this week" into actual dates
function getWeekDates(referenceDate = new Date()) {
  const weekStart = new Date(referenceDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }
  return weekDates;
}

// Regex patterns
const regexPatterns = {
  create_project: /create (?:a )?project (?:named )?([\w\s]+)/gi,
  create_timesheet: /create (?:a )?timesheet/gi,
  add_entry: /log (\d+) hours (?:for|on the project) ([\w\s]+)(?: on task ([\w\s]+))?(?: on (?:date )?([\w\s\d]+|today|tomorrow|this week))?/gi,
  leave_entry: /took leave on (?:date )?([\w\s\d]+|today|tomorrow|this week)/gi
};

// Date parsing utility
function parseDate(text) {
  text = text.toLowerCase();
  if (text === "today") return [new Date().toISOString().split('T')[0]];
  if (text === "tomorrow") {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return [t.toISOString().split('T')[0]];
  }
  if (text === "this week") return getWeekDates();
  // Fallback: try Date parsing
  const d = new Date(text);
  if (!isNaN(d)) return [d.toISOString().split('T')[0]];
  return []; // invalid date
}

// Main parsing function
function parseCommand(text) {
  const results = [];

  let match;

  // create_project
  while ((match = regexPatterns.create_project.exec(text)) !== null) {
    results.push({
      intent: "create_project",
      data: { project_name: match[1].trim() },
      error: null
    });
  }

  // create_timesheet
  while ((match = regexPatterns.create_timesheet.exec(text)) !== null) {
    results.push({
      intent: "create_timesheet",
      data: {},
      error: null
    });
  }

  // add_entry
  while ((match = regexPatterns.add_entry.exec(text)) !== null) {
    const hours = Number(match[1]);
    const project = match[2]?.trim();
    const task = match[3]?.trim() || null;
    const dateText = match[4]?.trim() || "today";
    const dates = parseDate(dateText);

    dates.forEach(date => {
      results.push({
        intent: "add_entry",
        data: { project, task, hours, date },
        error: null
      });
    });
  }

  // leave_entry
  while ((match = regexPatterns.leave_entry.exec(text)) !== null) {
    const dateText = match[1]?.trim() || "today";
    const dates = parseDate(dateText);

    dates.forEach(date => {
      results.push({
        intent: "add_entry",
        data: { type: "leave", date, hours: 8 }, // default leave hours
        error: null
      });
    });
  }

  return results;
}

// -------------------
// Test Commands
// -------------------
const commands = [
  "Create a project named Case Support Automation. And then create a timesheet and login to the project Building Automation for task documentation on date October 27. Also log 9 hours for the project HVAC system. The task is Code system review. The date is October 22. Also I took leave on October 24th.",
  "Log 5 hours for AirSys on task report generation on Tuesday and 4 hours for HVAC custom task planning on Thursday",
  "Create a new project named Support Automation. And then create a timesheet for this week. Unlock to the project building automation. And task code review for 8 hours on 22nd October.",
  "Add 8 hours to the project automation. On all day for this week. Timesheet.",
  "Can you create me a timesheet for this week? For the project called. X or there are four tasks in this project. The name of the tasks are ABCDE. BCDE. Each task took about two hours. Starting date of the project is N1. And the project will complete. Around 2 weeks."
];

commands.forEach((cmd, idx) => {
  console.log(`\nCommand ${idx + 1}:`);
  console.log(JSON.stringify(parseCommand(cmd), null, 2));
});
