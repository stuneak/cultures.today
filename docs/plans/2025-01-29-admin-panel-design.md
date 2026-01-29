# Admin Panel Design

## Overview

Add an admin panel at `/admin` for managing culture submissions. Admins can approve pending cultures, edit any culture, and delete cultures (with full Minio cleanup).

## Data Model

### User Model Changes

Add `isAdmin` boolean field:

```prisma
model User {
  id        String    @id @default(cuid())
  googleId  String    @unique
  email     String    @unique
  isAdmin   Boolean   @default(false)  // NEW
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  sessions          Session[]
  submittedCultures Culture[]
}
```

### Migration

```sql
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;
```

Admin assignment is manual via direct database update:
```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

## Backend API

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/cultures` | GET | List cultures by state |
| `/api/admin/cultures/[slug]` | GET | Get full culture details |
| `/api/admin/cultures/[slug]` | PATCH | Update culture fields |
| `/api/admin/cultures/[slug]` | DELETE | Hard delete + Minio cleanup |

### Authentication

All admin endpoints check `isAdmin` from database (not session):

```ts
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { isAdmin: true }
});

if (!user?.isAdmin) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### GET /api/admin/cultures

Query params:
- `state`: "pending" | "approved" (required)

Returns list of cultures with basic info (id, name, slug, state, createdAt, submittedBy).

### GET /api/admin/cultures/[slug]

Returns full culture with:
- All culture fields
- Languages with phrases (including audioUrl)
- Content items

### PATCH /api/admin/cultures/[slug]

Accepts partial update of:
- name, description, flagUrl, boundary, state
- languages (full replacement)
- contents (full replacement)

Approving a culture = PATCH with `{ state: "approved" }`.

### DELETE /api/admin/cultures/[slug]

1. Fetch culture with all related data
2. Collect Minio file paths:
   - `flagUrl`
   - All `audioUrl` from phrases
   - All `url` from contents where `contentType = "UPLOAD"`
3. Delete files from Minio
4. Delete culture from database (cascades via Prisma)

## Frontend UI

### Page Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Pending]  [Approved]                    (tabs)        │
├───────────────────┬─────────────────────────────────────┤
│                   │                                     │
│  Culture List     │   Detail / Edit Panel               │
│                   │                                     │
│  ┌─────────────┐  │   Name: [___________]               │
│  │ Maori ▸     │  │   Description: [___________]        │
│  └─────────────┘  │   Flag: [image] [Change]            │
│  ┌─────────────┐  │   Boundary: [preview map]           │
│  │ Sami        │  │                                     │
│  └─────────────┘  │   Languages: [list...]              │
│  ┌─────────────┐  │   Content: [list...]                │
│  │ Inuit       │  │                                     │
│  └─────────────┘  │   ┌──────────┐  ┌──────────┐        │
│                   │   │ Approve  │  │  Delete  │        │
│                   │   └──────────┘  └──────────┘        │
└───────────────────┴─────────────────────────────────────┘
```

### Behavior

- Tab switch fetches cultures with `?state=pending` or `?state=approved`
- Clicking culture in list loads details on right panel
- Edit fields inline, save via PATCH
- "Approve" button visible only for pending cultures
- "Delete" shows confirmation modal before hard delete
- Non-admin users silently redirected to `/`

### Components

- `AdminPage` - layout, auth redirect logic
- `CultureTabs` - tab switching (Pending/Approved)
- `CultureList` - scrollable list with selection
- `CultureEditor` - form with all editable fields + action buttons

### Editable Fields

| Field | Editable | Input Type |
|-------|----------|------------|
| Name | Yes | Text input |
| Slug | No | Read-only display |
| Description | Yes | Textarea |
| Flag | Yes | Image preview + upload |
| Boundary | Yes | Map preview + drawing tool |
| State | Yes | Approve button |
| Languages | Yes | Add/edit/remove |
| Content | Yes | Add/edit/remove |

### Delete Confirmation

Modal text: "Delete [Culture Name]? This will permanently remove the culture and all associated files. This cannot be undone."

Buttons: "Cancel" (neutral), "Delete" (red/destructive)

## Access Control

- `/admin` page checks auth on load
- If not logged in or not admin → redirect to `/`
- API returns 401 (not logged in) or 403 (not admin)

## Files to Create/Modify

### New Files
- `prisma/migrations/[timestamp]_add_is_admin/migration.sql`
- `src/app/admin/page.tsx`
- `src/app/api/admin/cultures/route.ts`
- `src/app/api/admin/cultures/[slug]/route.ts`
- `src/components/admin/AdminPage.tsx`
- `src/components/admin/CultureTabs.tsx`
- `src/components/admin/CultureList.tsx`
- `src/components/admin/CultureEditor.tsx`

### Modified Files
- `prisma/schema.prisma` - add isAdmin to User
- `src/lib/minio.ts` - may need bulk delete helper
