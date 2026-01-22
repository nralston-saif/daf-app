# DAF App Revisions - Implementation Plan

## Overview
This plan covers UI/UX improvements and new features based on the annotated screenshots review.

---

## Phase 1: Database Schema Changes

### 1.1 Foundation Table
Add new column:
```sql
ALTER TABLE foundations ADD COLUMN annual_giving_goal numeric DEFAULT 0;
```

### 1.2 Organizations Table
Add new columns:
```sql
ALTER TABLE organizations ADD COLUMN recommender_id uuid REFERENCES users(id);
ALTER TABLE organizations ADD COLUMN personal_involvement boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN impact_goals text;
```

### 1.3 Grants Table
Add recurring grant support:
```sql
CREATE TYPE grant_recurrence AS ENUM ('one_time', 'monthly', 'quarterly', 'semi_annual', 'annual');
ALTER TABLE grants ADD COLUMN recurrence_type grant_recurrence DEFAULT 'one_time';
ALTER TABLE grants ADD COLUMN next_payment_date date;
```
Note: Will remove `focus_areas` from grant form (inherit from organization).

### 1.4 Meetings Table
Add meeting format and link:
```sql
CREATE TYPE meeting_format AS ENUM ('zoom', 'call', 'in_person');
ALTER TABLE meetings ADD COLUMN format meeting_format DEFAULT 'zoom';
ALTER TABLE meetings ADD COLUMN meeting_link text;
ALTER TABLE meetings ADD COLUMN timezone text DEFAULT 'America/Los_Angeles';
```

---

## Phase 2: Install Dependencies

```bash
npm install recharts
```
Recharts is needed for the pie charts on the dashboard.

---

## Phase 3: Dashboard Enhancements

### 3.1 Annual Giving Goal Display
**File:** `src/app/(dashboard)/dashboard/page.tsx`

- Add "Annual Giving Goal" card in the stats row
- Show progress: `$YTD_Granted / $Annual_Goal`
- Allow editing the goal (modal or inline)

### 3.2 Pie Chart: Annual Goal Progress
**New Component:** `src/components/charts/goal-progress-chart.tsx`

- Donut chart showing:
  - Granted amount (filled portion)
  - Remaining to goal (empty portion)
- Display percentage in center
- Colors from Tailwind theme variables (--chart-1, --chart-2)

### 3.3 Pie Chart: Focus Area Breakdown
**New Component:** `src/components/charts/focus-area-chart.tsx`

- Pie chart showing grant distribution by focus area
- Aggregate from organizations' tags for all approved/paid grants
- Legend showing each focus area with amount
- Colors from Tailwind theme variables (--chart-1 through --chart-5)

### 3.4 What-If Forecasting (Future Enhancement)
**Scope:** Basic implementation for now
- "If we grant $X/month, we'll reach goal by [date]"
- Simple projection based on current run rate
- Can be expanded later

---

## Phase 4: Organizations Form Updates

### 4.1 Files to Modify
- `src/app/(dashboard)/organizations/organization-form.tsx`
- `src/app/(dashboard)/organizations/new/page.tsx`
- `src/app/(dashboard)/organizations/[id]/edit/page.tsx`
- `src/types/database.ts`

### 4.2 New Fields

| Field | Type | UI Component |
|-------|------|--------------|
| Recommender | Dropdown (user select) | `<Select>` with foundation users |
| Personal Involvement | Yes/No toggle | `<Switch>` or radio buttons |
| Impact Goals | Text area | `<Textarea>` |
| Tags/Focus Areas | Multi-select dropdown | `<MultiSelect>` (new component) |

### 4.3 Tags/Focus Areas Dropdown
**New Component:** `src/components/ui/multi-select.tsx`

- Replace comma-separated text input with multi-select
- Options populated from foundation's `focus_areas`
- Allow custom tags with "Add new" option

---

## Phase 5: Grants Updates

### 5.1 Remove Focus Area Field
**File:** `src/app/(dashboard)/grants/grant-form.tsx`

- Remove focus_areas input from form
- When displaying grants, show organization's tags instead
- Update grants pipeline and table views

### 5.2 Show Voter Names
**Files:**
- `src/app/(dashboard)/grants/[id]/page.tsx`
- `src/app/(dashboard)/grants/grants-pipeline.tsx`
- `src/app/(dashboard)/grants/grants-table.tsx`

- Query `grant_reviews` with `reviewer` join
- Display reviewer names with their vote (approve/decline/abstain)
- Show vote summary: "3 approve, 1 decline"

### 5.3 Scheduled/Recurring Grants
**File:** `src/app/(dashboard)/grants/grant-form.tsx`

Add new section "Payment Schedule":
- Dropdown for recurrence type:
  - One-time (default)
  - Monthly
  - Quarterly
  - Semi-annual
  - Annual
- For recurring: show next payment date picker
- For recurring: show "Commitment" badge on grant cards

---

## Phase 6: Meetings Updates

### 6.1 Files to Modify
- `src/app/(dashboard)/meetings/meeting-form.tsx`
- `src/app/(dashboard)/meetings/page.tsx`
- `src/app/(dashboard)/meetings/[id]/page.tsx`
- `src/types/database.ts`

### 6.2 New Fields

| Field | Type | UI Component |
|-------|------|--------------|
| Meeting Format | Dropdown | `<Select>` (Zoom, Call, In-Person) |
| Meeting Link | URL input | `<Input type="url">` (shown for Zoom/Call) |
| Timezone | Dropdown | `<Select>` with common timezones |
| Attendees | Multi-select dropdown | `<MultiSelect>` with foundation users |

### 6.3 Timezone Options
Common US timezones:
- America/New_York (Eastern)
- America/Chicago (Central)
- America/Denver (Mountain)
- America/Los_Angeles (Pacific)

---

## Phase 7: Settings Updates

### 7.1 Remove Bio Field
**File:** `src/app/(dashboard)/settings/profile-settings.tsx`

- Remove Bio textarea from profile form
- Keep in database (no migration needed) but don't display

---

## Implementation Order

1. **Database migrations** (Phase 1) - Foundation for all changes
2. **Install recharts** (Phase 2) - Needed for dashboard
3. **TypeScript types update** - Update `database.ts` with new fields
4. **Multi-select component** (Phase 4.3) - Reusable for orgs and meetings
5. **Organizations form** (Phase 4) - New fields
6. **Meetings form** (Phase 6) - New fields
7. **Dashboard charts** (Phase 3) - Visualizations
8. **Grants updates** (Phase 5) - Remove focus area, add voter names, recurring
9. **Settings cleanup** (Phase 7) - Remove bio

---

## Questions Resolved

1. **Focus Area duplication** - Remove from Grants, inherit from Organization
2. **Voter names** - Yes, show who voted on grants
3. **Forecasting** - Basic "if X/month, reach goal by Y" projection

---

## Files to Create
- `src/components/charts/goal-progress-chart.tsx`
- `src/components/charts/focus-area-chart.tsx`
- `src/components/ui/multi-select.tsx`

## Files to Modify
- `src/types/database.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/organizations/organization-form.tsx`
- `src/app/(dashboard)/grants/grant-form.tsx`
- `src/app/(dashboard)/grants/[id]/page.tsx`
- `src/app/(dashboard)/grants/grants-pipeline.tsx`
- `src/app/(dashboard)/grants/grants-table.tsx`
- `src/app/(dashboard)/meetings/meeting-form.tsx`
- `src/app/(dashboard)/meetings/page.tsx`
- `src/app/(dashboard)/settings/profile-settings.tsx`

---

## Estimated Scope
- Database migrations: 4 migrations
- New components: 3 files
- Modified files: ~10 files
- New npm packages: 1 (recharts)
