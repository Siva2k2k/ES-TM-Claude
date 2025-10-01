# Report Inheritance Diagram

## Visual Representation of Report Access by Role

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPER ADMIN (18+ Reports)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              MANAGEMENT (16 Reports)                              │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │          MANAGER (11 Reports)                              │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │  │
│  │  │  │       LEAD (7 Reports)                              │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │    EMPLOYEE (4 Reports)                     │  │  │  │  │
│  │  │  │  │                                              │  │  │  │  │
│  │  │  │  │  📊 My Payslip                             │  │  │  │  │
│  │  │  │  │  ⏰ My Timesheet Summary                    │  │  │  │  │
│  │  │  │  │  📈 My Performance Report                   │  │  │  │  │
│  │  │  │  │  📅 My Leave & Attendance                   │  │  │  │  │
│  │  │  │  │                                              │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────────┘  │  │  │  │
│  │  │  │                                                     │  │  │  │
│  │  │  │  + LEAD TEAM REPORTS (3 reports)                   │  │  │  │
│  │  │  │  👥 Team Timesheet Summary                        │  │  │  │
│  │  │  │  📊 Team Performance Dashboard                     │  │  │  │
│  │  │  │  📅 Team Attendance Report                         │  │  │  │
│  │  │  │                                                     │  │  │  │
│  │  │  └────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                            │  │  │
│  │  │  + MANAGER PROJECT REPORTS (4 reports)                    │  │  │
│  │  │  🎯 Project Performance Report                            │  │  │
│  │  │  💰 Project Financial Report                              │  │  │
│  │  │  👥 Team Resource Allocation                              │  │  │
│  │  │  💵 Team Billing Summary                                  │  │  │
│  │  │                                                            │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  + MANAGEMENT EXECUTIVE REPORTS (5 reports)                      │  │
│  │  📊 Executive Financial Dashboard                                │  │
│  │  📈 Organizational Utilization Report                            │  │
│  │  🏦 Client Billing & Revenue Report                              │  │
│  │  👥 Workforce Analytics                                          │  │
│  │  🎯 All Projects Portfolio Report                                │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  + SUPER ADMIN SYSTEM REPORTS (2+ reports)                              │
│  🔒 System Audit Logs Report                                            │
│  🔐 User Access Report                                                  │
│  🏥 System Health Report                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detailed Breakdown

### 📊 Employee (4 Reports)
```
┌─────────────────────────────┐
│   PERSONAL REPORTS ONLY     │
├─────────────────────────────┤
│ ✅ My Payslip              │
│ ✅ My Timesheet Summary     │
│ ✅ My Performance Report    │
│ ✅ My Leave & Attendance    │
└─────────────────────────────┘
```

### 👥 Lead (7 Reports = 4 + 3)
```
┌─────────────────────────────┐
│   INHERITED FROM EMPLOYEE   │
├─────────────────────────────┤
│ ✅ My Payslip              │
│ ✅ My Timesheet Summary     │
│ ✅ My Performance Report    │
│ ✅ My Leave & Attendance    │
└─────────────────────────────┘
         +
┌─────────────────────────────┐
│    LEAD TEAM REPORTS        │
├─────────────────────────────┤
│ ✅ Team Timesheet Summary   │
│ ✅ Team Performance         │
│ ✅ Team Attendance          │
└─────────────────────────────┘
```

### 👨‍💼 Manager (11 Reports = 4 + 3 + 4)
```
┌─────────────────────────────┐
│ INHERITED FROM EMPLOYEE+LEAD│
├─────────────────────────────┤
│ ✅ All 4 Personal Reports   │
│ ✅ All 3 Team Reports       │
└─────────────────────────────┘
         +
┌─────────────────────────────┐
│   MANAGER PROJECT REPORTS   │
├─────────────────────────────┤
│ ✅ Project Performance      │
│ ✅ Project Financials       │
│ ✅ Resource Allocation      │
│ ✅ Team Billing             │
└─────────────────────────────┘
```

### 🏢 Management (16 Reports = 4 + 3 + 4 + 5)
```
┌─────────────────────────────┐
│ INHERITED FROM EMPLOYEE+    │
│ LEAD+MANAGER                │
├─────────────────────────────┤
│ ✅ All 4 Personal Reports   │
│ ✅ All 3 Team Reports       │
│ ✅ All 4 Project Reports    │
└─────────────────────────────┘
         +
┌─────────────────────────────┐
│   EXECUTIVE REPORTS         │
├─────────────────────────────┤
│ ✅ Financial Dashboard      │
│ ✅ Org Utilization          │
│ ✅ Client Billing           │
│ ✅ Workforce Analytics      │
│ ✅ Portfolio Analysis       │
└─────────────────────────────┘
```

### 🔐 Super Admin (18+ Reports = ALL)
```
┌─────────────────────────────┐
│ INHERITED FROM ALL ROLES    │
├─────────────────────────────┤
│ ✅ All 4 Personal Reports   │
│ ✅ All 3 Team Reports       │
│ ✅ All 4 Project Reports    │
│ ✅ All 5 Executive Reports  │
└─────────────────────────────┘
         +
┌─────────────────────────────┐
│   SYSTEM REPORTS            │
├─────────────────────────────┤
│ ✅ Audit Logs               │
│ ✅ User Access              │
│ ✅ System Health            │
└─────────────────────────────┘
```

## Real-World Examples

### Example 1: John - Employee
```
John (Employee) logs in:

Available Reports:
├─ 📊 My Payslip ✅
├─ ⏰ My Timesheet Summary ✅
├─ 📈 My Performance Report ✅
└─ 📅 My Leave & Attendance ✅

Restricted:
├─ ❌ Cannot see team reports
├─ ❌ Cannot see project financials
└─ ❌ Cannot see other employees' data
```

### Example 2: Sarah - Lead
```
Sarah (Lead) logs in:

Available Reports:
Personal (Inherited from Employee):
├─ 📊 My Payslip ✅ (Sarah's own salary)
├─ ⏰ My Timesheet Summary ✅ (Sarah's timesheets)
├─ 📈 My Performance Report ✅ (Sarah's performance)
└─ 📅 My Leave & Attendance ✅ (Sarah's attendance)

Team Reports:
├─ 👥 Team Timesheet Summary ✅ (Her 5 direct reports)
├─ 📊 Team Performance Dashboard ✅ (Her team's metrics)
└─ 📅 Team Attendance Report ✅ (Her team's attendance)

Restricted:
├─ ❌ Cannot see other teams' reports
├─ ❌ Cannot see project financials
└─ ❌ Cannot see company-wide data
```

### Example 3: Mike - Manager
```
Mike (Manager) logs in:

Available Reports:
Personal (Inherited from Employee):
├─ 📊 My Payslip ✅
├─ ⏰ My Timesheet Summary ✅
├─ 📈 My Performance Report ✅
└─ 📅 My Leave & Attendance ✅

Team Reports (Inherited from Lead):
├─ 👥 Team Timesheet Summary ✅
├─ 📊 Team Performance Dashboard ✅
└─ 📅 Team Attendance Report ✅

Project Reports:
├─ 🎯 Project Performance Report ✅ (3 projects he manages)
├─ 💰 Project Financial Report ✅ (His projects only)
├─ 👥 Team Resource Allocation ✅ (His teams)
└─ 💵 Team Billing Summary ✅ (His teams' revenue)

Restricted:
├─ ❌ Cannot see other managers' projects
├─ ❌ Cannot see company-wide financials
└─ ❌ Cannot see all clients' billing
```

### Example 4: Lisa - Management
```
Lisa (Management) logs in:

Available Reports:
ALL Previous Roles:
├─ ✅ All 4 Personal Reports (Lisa's own)
├─ ✅ All 3 Team Reports (Can view ANY team)
├─ ✅ All 4 Project Reports (Can view ALL projects)

Executive Reports:
├─ 📊 Executive Financial Dashboard ✅ (Company-wide)
├─ 📈 Organizational Utilization ✅ (All departments)
├─ 🏦 Client Billing & Revenue ✅ (All clients)
├─ 👥 Workforce Analytics ✅ (All employees)
└─ 🎯 All Projects Portfolio ✅ (All projects)

Restricted:
├─ ❌ Cannot see system audit logs
├─ ❌ Cannot see user access reports
└─ ❌ Cannot see system health reports
```

### Example 5: Admin - Super Admin
```
Admin (Super Admin) logs in:

Available Reports:
ALL Reports:
├─ ✅ All Personal Reports (Admin's own)
├─ ✅ All Team Reports (ALL teams)
├─ ✅ All Project Reports (ALL projects)
├─ ✅ All Executive Reports (Company-wide)

System Reports:
├─ 🔒 System Audit Logs ✅
├─ 🔐 User Access Report ✅
└─ 🏥 System Health Report ✅

No Restrictions - Full Access
```

## Report Visibility Matrix

| User | Personal | Own Team | Other Teams | Own Projects | All Projects | Company-wide | System |
|------|----------|----------|-------------|--------------|--------------|--------------|--------|
| **Employee** | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Lead** | ✅ Own | ✅ Yes | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manager** | ✅ Own | ✅ Yes | ❌ | ✅ Yes | ❌ | ❌ | ❌ |
| **Management** | ✅ Own | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ❌ |
| **Super Admin** | ✅ Own | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |

## Key Takeaways

1. **Inheritance is Automatic**: When a user gets promoted from Employee → Lead, they automatically get access to Team reports PLUS keep their Personal reports.

2. **No Data Loss on Promotion**: Promoting an Employee to Manager doesn't remove their ability to view their own payslip - they gain new reports, not lose old ones.

3. **Scope Expands, Not Replaces**: Each role expands the data scope:
   - Employee: Self
   - Lead: Self + Direct Team
   - Manager: Self + Teams + Managed Projects
   - Management: Self + All Teams + All Projects
   - Super Admin: Everything + System Data

4. **Everyone Remains an Employee**: Even the CEO can generate their own payslip report - they're still an employee who happens to have executive reporting access.

5. **Clear Boundaries**: A Manager cannot see other managers' projects, maintaining proper data isolation while allowing necessary visibility.
