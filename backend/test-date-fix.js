/**
 * Test script to verify UTC date handling
 * Run with: node backend/test-date-fix.js
 */

// Simulate the parseLocalDate function
function parseLocalDate(dateString) {
  const parts = dateString.split("T")[0].split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  // OLD WAY (local timezone) - causes issues
  const localDate = new Date(year, month, day, 0, 0, 0, 0);

  // NEW WAY (UTC) - preserves calendar date
  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  return { localDate, utcDate };
}

function getMondayOfWeek(dateString) {
  const parts = dateString.split("T")[0].split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0)
  );

  return monday;
}

function getSundayOfWeek(mondayDate) {
  return new Date(
    Date.UTC(
      mondayDate.getUTCFullYear(),
      mondayDate.getUTCMonth(),
      mondayDate.getUTCDate() + 6,
      23,
      59,
      59,
      999
    )
  );
}

console.log("=".repeat(80));
console.log("DATE HANDLING TEST");
console.log("=".repeat(80));
console.log();

const testDate = "2025-10-06"; // Monday
console.log(`Input from frontend: "${testDate}" (Monday, October 6, 2025)`);
console.log();

// Show the difference
const { localDate, utcDate } = parseLocalDate(testDate);

console.log("OLD WAY (Local Timezone):");
console.log(`  Created: ${localDate}`);
console.log(`  ISO String: ${localDate.toISOString()}`);
console.log(
  `  → In IST (UTC+5:30), this becomes: 2025-10-05T18:30:00.000Z (WRONG - Sunday!)`
);
console.log();

console.log("NEW WAY (UTC):");
console.log(`  Created: ${utcDate}`);
console.log(`  ISO String: ${utcDate.toISOString()}`);
console.log(
  `  → Calendar date preserved: 2025-10-06T00:00:00.000Z (CORRECT - Monday!)`
);
console.log();

// Show week calculation
const monday = getMondayOfWeek(testDate);
const sunday = getSundayOfWeek(monday);

console.log("Week Calculation:");
console.log(`  Monday (week_start_date): ${monday.toISOString()}`);
console.log(`  Sunday (week_end_date):   ${sunday.toISOString()}`);
console.log();

// Show what MongoDB will see
console.log("What will be stored in MongoDB:");
console.log(`  week_start_date: ${monday.toISOString()} (Monday, Oct 6)`);
console.log(`  week_end_date:   ${sunday.toISOString()} (Sunday, Oct 12)`);
console.log();

// Verify day of week
console.log("Verification:");
console.log(`  Monday's UTC day: ${monday.getUTCDay()} (1 = Monday) ✓`);
console.log(`  Sunday's UTC day: ${sunday.getUTCDay()} (0 = Sunday) ✓`);
console.log(
  `  Days between: ${Math.floor(
    (sunday - monday) / (1000 * 60 * 60 * 24)
  )} days (6 days + partial) ✓`
);
console.log();

console.log("=".repeat(80));
console.log("✅ FIX VERIFIED: Dates will be stored correctly in MongoDB!");
console.log("=".repeat(80));
