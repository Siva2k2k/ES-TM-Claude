# Company Calendar Holiday System

## Overview

This is a simplified company calendar and holiday management system that automatically creates holiday entries in employee timesheets when holidays exist during the week. The system has been streamlined for simplicity and ease of use.

## Key Features

### 🎯 **Simplified Design**

- **Single Company Calendar**: Removed complex calendar types (regional, personal) and focuses on one company-wide calendar
- **Company-Wide Holidays**: All holidays are company-wide by default, no calendar linking required
- **Auto Holiday Entries**: Automatically creates adjustable holiday time entries in timesheets

### 🔧 **Core Functionality**

#### Holiday Management

- Admin can declare company holidays from settings
- Holidays are automatically updated across all timesheets
- Support for different holiday types: `public`, `company`, `optional`
- Bulk import functionality for adding multiple holidays

#### Timesheet Integration

- When users create timesheets, if the week contains holidays, holiday entries are auto-created
- Holiday entries are named "Holiday: [Holiday Name]" with adjustable hours
- Default holiday hours configurable (default: 8 hours)
- Users can adjust holiday hours if allowed in settings

#### System Settings

- `auto_create_holiday_entries`: Enable/disable automatic holiday entry creation
- `default_holiday_hours`: Default hours for holiday entries (0-24)
- `allow_holiday_hour_adjustment`: Allow users to modify auto-generated holiday hours

## Database Schema Changes

### Calendar Model (Simplified)

```typescript
interface ICalendar {
  name: string;
  description?: string;
  timezone: string;
  is_active: boolean;

  // Holiday settings
  auto_create_holiday_entries: boolean;
  default_holiday_hours: number;

  // Working days and hours
  working_days: number[]; // [1,2,3,4,5] = Mon-Fri
  working_hours_per_day: number;
}
```

### CompanyHoliday Model (Simplified)

```typescript
interface ICompanyHoliday {
  name: string;
  date: Date;
  holiday_type: "public" | "company" | "optional";
  description?: string;
  is_active: boolean;
  created_by: ObjectId;
}
```

### TimeEntry Model (Extended)

```typescript
interface ITimeEntry {
  // ... existing fields
  entry_category:
    | "project"
    | "leave"
    | "training"
    | "holiday"
    | "miscellaneous";

  // Holiday-specific fields
  holiday_name?: string;
  holiday_type?: string;
  is_auto_generated?: boolean;
}
```

## API Endpoints

### Holiday System Management

```
POST   /api/holiday-system/initialize      # Initialize system (Super Admin)
GET    /api/holiday-system/status          # Get system status
PUT    /api/holiday-system/calendar        # Update calendar settings (Admin)
GET    /api/holiday-system/holidays/:year  # Get holidays for year
POST   /api/holiday-system/bulk-import     # Bulk import holidays (Admin)
```

### Holiday CRUD (Simplified)

```
GET    /api/holidays                       # Get all holidays (with filters)
GET    /api/holidays/upcoming              # Get upcoming holidays
GET    /api/holidays/check/:date           # Check if date is holiday
GET    /api/holidays/:id                   # Get holiday by ID
POST   /api/holidays                       # Create holiday (Admin)
PUT    /api/holidays/:id                   # Update holiday (Admin)
DELETE /api/holidays/:id                   # Delete holiday (Admin)
```

## Usage Flow

### 1. System Initialization

```typescript
// Initialize the holiday system (one-time setup)
POST / api / holiday - system / initialize;
```

### 2. Configure Company Calendar

```typescript
// Update calendar settings
PUT /api/holiday-system/calendar
{
  "auto_create_holiday_entries": true,
  "default_holiday_hours": 8,
  "working_days": [1, 2, 3, 4, 5],
  "working_hours_per_day": 8
}
```

### 3. Add Company Holidays

```typescript
// Add a single holiday
POST /api/holidays
{
  "name": "Independence Day",
  "date": "2025-07-04",
  "holiday_type": "public",
  "description": "National Independence Day"
}

// Bulk import holidays
POST /api/holiday-system/bulk-import
{
  "holidays": [
    {
      "name": "New Year's Day",
      "date": "2025-01-01",
      "holiday_type": "public"
    },
    {
      "name": "Christmas Day",
      "date": "2025-12-25",
      "holiday_type": "public"
    }
  ]
}
```

### 4. Automatic Timesheet Holiday Creation

When a user creates a timesheet for a week containing holidays:

```typescript
// Timesheet creation automatically triggers holiday entry creation
POST /api/timesheets
{
  "user_id": "user123",
  "week_start_date": "2025-06-30"  // Week contains July 4th holiday
}

// Result: Timesheet created with auto-generated holiday entry:
// - Date: 2025-07-04
// - Entry Category: "holiday"
// - Hours: 8 (configurable)
// - Description: "Holiday: Independence Day"
// - Is Billable: false
// - Is Auto Generated: true
```

## System Settings

The system uses these configurable settings:

| Setting                         | Type    | Default | Description                               |
| ------------------------------- | ------- | ------- | ----------------------------------------- |
| `auto_create_holiday_entries`   | boolean | `true`  | Auto-create holiday entries in timesheets |
| `default_holiday_hours`         | number  | `8`     | Default hours for holiday entries         |
| `allow_holiday_hour_adjustment` | boolean | `true`  | Allow users to adjust holiday hours       |

## Benefits

### 🚀 **Simplified Architecture**

- Removed complex calendar hierarchies
- Single source of truth for company holidays
- Reduced configuration complexity

### ⚡ **Automatic Integration**

- No manual holiday entry creation required
- Consistent holiday tracking across all employees
- Automatic timesheet updates when holidays are added

### 🔧 **Flexible Configuration**

- Adjustable holiday hours
- Configurable auto-creation behavior
- Support for different holiday types

### 👥 **User-Friendly**

- Auto-generated entries are clearly marked
- Users can adjust hours if permitted
- Seamless integration with existing timesheet workflow

## Implementation Notes

### Holiday Detection Logic

1. When a timesheet is created, the system checks for holidays within the week range
2. For each active holiday found, creates a holiday time entry
3. Holiday entries are marked as `is_auto_generated: true`
4. Users can modify hours if `allow_holiday_hour_adjustment` is enabled

### Permissions

- **Super Admin**: Full system control, initialization
- **Management**: Holiday management, calendar settings
- **Users**: View holidays, adjust auto-generated holiday hours (if allowed)

### Error Handling

- Holiday creation gracefully handles duplicates
- Timesheet creation continues even if holiday entry creation fails
- Clear error messages for invalid configurations

## Migration Notes

### From Complex Calendar System

1. Existing calendar data can be migrated by selecting the active company calendar
2. Calendar-linked holidays become company-wide holidays
3. Regional/personal calendars can be archived or removed

### Backward Compatibility

- Existing timesheet entries remain unchanged
- New holiday entries use the new `entry_category: 'holiday'` format
- Existing project/leave entries continue to work normally

## Testing

### Unit Tests

- Holiday detection within date ranges
- Automatic time entry creation
- Calendar settings validation
- Permission checks

### Integration Tests

- Full timesheet creation flow with holidays
- Holiday management API endpoints
- System initialization process

## Future Enhancements

### Potential Features

- Holiday import from external calendar systems
- Timezone-aware holiday calculations
- Holiday templates for different regions
- Advanced holiday recurrence patterns
- Holiday conflict detection and resolution

### Performance Optimizations

- Caching of frequently accessed holidays
- Batch processing for bulk holiday operations
- Optimized database queries for date range filtering
