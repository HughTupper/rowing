# GitHub Copilot Instructions for Rowing

## Project Overview

Rowing is a rowing application with which helps users track their rowing activities, as well as offering single player nad multiplayer live rowing sessions. Built as a Turborepo monorepo with Next.js 16 (App Router) and Supabase as the backend.

## Tech Stack

### Core Framework

- **Next.js 16.1.1** with App Router and React 19
- **TypeScript 5.9+** in strict mode
- **Turborepo 2.7.2** for monorepo orchestration
- **Node.js >= 24n.0.0** and **npm 11**

### Backend & Database

- **Supabase** (Backend-as-a-Service)
  - PostgreSQL with Row Level Security (RLS)
  - Supabase Auth for authentication
  - Supabase SSR (v0.8.0) for session management

### UI & Styling

- **Tailwind CSS 4** (utility-first styling)
- **shadcn/ui** component library (Radix UI primitives)
- **Lucide React** for icons
- **React Markdown** with `remark-gfm` for markdown rendering

### Tooling

- **ESLint 9** with Prettier 3.7 for code quality
- **Supabase CLI** for local development

## Monorepo Structure

```
apps/
  rowing/        # Main Next.js application
packages/
  database/             # Supabase config, migrations, seed data
  ui/                   # Shared shadcn/ui component library
  typescript-config/    # Shared TypeScript configs
  eslint-config/        # Shared ESLint configs
```

Each package is independently versioned. Use workspace protocol references in package.json (`workspace:*`).

## Code Organization Conventions

### Import Patterns

```typescript
// External dependencies first
import { useState } from "react";
import { Card } from "@repo/ui/card";

// Internal modules using @ alias
import { createServerClient } from "@/lib/supabase/server";
import { RowingSessions } from "@/components/RowingSessions";

// Types
import type { Note } from "./actions";
```

### Path Aliases

- `@/*` points to `src/*` in apps/rowing
- Always use absolute imports with `@/` prefix

### Component Organization

- Components live in `src/components/` directory
- One component per file
- Co-locate types or export from same file
- Name file after primary export: `RowingSessions.tsx` exports `RowingSessions`

### Naming Conventions

- **Components**: PascalCase (`RowingSessions`, `AddNoteForm`)
- **Functions**: camelCase (`createRowingSession`, `handleSubmit`)
- **Types/Interfaces**: PascalCase (`Note`, `Collection`, `NoteWithCollection`)
- **Files**: PascalCase if components (`RowingSessions.tsx`, `CollectionTreeItem.tsx`) or camelCase for utilities (`supabaseClient.ts`, `dateUtils.ts`)

## Architecture Patterns

### Next.js App Router Structure

```
src/app/
├── (auth)/              # Route group for auth pages (centered layout)
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/           # Protected routes (two-pane layout with sidebar)
│   ├── layout.tsx
│   ├── collections/
│   │   ├── actions.ts   # Server actions for collections
│   │   └── page.tsx
│   ├── rowingSessions/
│   │   ├── actions.ts   # Server actions for rowing sessions
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── shared/page.tsx
└── api/auth/signout/route.ts
```

### Server vs Client Components

**Default to Server Components** for:

- Pages and layouts
- Data fetching
- Direct database queries
- Rendering static content

**Use Client Components** (marked with `'use client'`) for:

- Interactive forms and buttons
- useState, useEffect, event handlers
- Browser APIs (localStorage, window)
- Third-party libraries requiring client-side JS

```typescript
// Server Component (default)
export default async function RowingSessionsPage() {
  const supabase = createServerClient();
  const { data: rowingSessions } = await supabase
    .from("rowingSessions")
    .select("*");
  return <RowingSessions rowingSessions={rowingSessions} />;
}

// Client Component
("use client");
export function AddRowingSessionForm() {
  const [title, setTitle] = useState("");
  // ... interactive logic
}
```

### Server Actions Pattern

All data mutations use Server Actions marked with `'use server'`. Place in `actions.ts` files within route directories.

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function createRowingSession(formData: FormData) {
  const supabase = createServerClient();

  // Validate user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Perform mutation
  const { error } = await supabase.from("rowingSessions").insert({
    title: formData.get("title"),
    owner_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  // Invalidate cache
  revalidatePath("/dashboard/rowingSessions");
  return { success: true };
}
```

**Server Action Rules:**

- Always validate authentication at the start
- Return error objects: `{ error: string }` or `{ success: boolean }`
- Use `revalidatePath()` or `revalidateTag()` after mutations
- Export type definitions alongside actions
- Handle errors gracefully with user-friendly messages

### Supabase Client Patterns

**Three client types:**

1. **Server Client** (server components, server actions, route handlers):

```typescript
import { createServerClient } from "@/lib/supabase/server";
const supabase = createServerClient();
```

2. **Client Client** (client components):

```typescript
import { createBrowserClient } from "@/lib/supabase/client";
const supabase = createBrowserClient();
```

3. **Middleware Client** (middleware only):

```typescript
import { updateSession } from "@/lib/supabase/middleware";
```

**Never mix client types.** Use the appropriate client for the environment.

### Authentication & Authorization

**Middleware Protection:**

- Middleware runs on all routes (except static files)
- Protects `/dashboard/*` routes - redirects unauthenticated users to `/login`
- Redirects authenticated users from `/login` and `/signup` to `/dashboard/rowingSessions`
- Updates session on every request

**User Validation in Protected Routes:**

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) {
  redirect("/login");
}
```

**Row Level Security (RLS):**

- All database tables have RLS enabled
- Users can only access their own data by default
- Trust RLS policies - don't add redundant permission checks in application code

## Database Patterns

### Schema Overview

- **`profiles`**: User profiles (linked to auth.users)
- **`rowingSessions`**: Rowing session items with owner tracking

### Query Patterns

**Fetching user's rowingSessions:**

```typescript
const { data: rowingSessions } = await supabase
  .from("rowingSessions")
  .select("*")
  .order("created_at", { ascending: false });
```

**Nested collections (hierarchical):**

```typescript
const { data: collections } = await supabase
  .from("collections")
  .select("*, children:collections(*)")
  .is("parent_id", null);
```

### Data Mutations

**Insert:**

```typescript
const { data, error } = await supabase
  .from("rowingSessions")
  .insert({ title, description, owner_id: user.id })
  .select()
  .single();
```

**Update:**

```typescript
const { error } = await supabase
  .from("rowingSessions")
  .update({ title, description })
  .eq("id", noteId);
```

**Delete:**

```typescript
const { error } = await supabase
  .from("rowingSessions")
  .delete()
  .eq("id", noteId);
```

**Database Rules:**

- Always check for `error` after queries
- Use `.single()` when expecting one result
- Use `.select()` after insert/update if you need the result
- Trust RLS policies - they enforce authorization
- Database triggers handle `updated_at` timestamps automatically

## Component Patterns

### TypeScript Component Structure

```typescript
interface RowingSessionsProps {
  rowingSessions: RowingSession[];
  onRowingSessionClick?: (rowingSessionId: string) => void;
}

export function RowingSessions({
  rowingSessions,
  onRowingSessionClick,
}: RowingSessionsProps) {
  // Component logic
  return (
    <div className="space-y-2">
      {rowingSessions.map((rowingSession) => (
        <RowingSessionItem
          key={rowingSession.id}
          rowingSession={rowingSession}
          onClick={onRowingSessionClick}
        />
      ))}
    </div>
  );
}
```

**Component Rules:**

- Use functional components only (no class components)
- Props destructuring in function signature
- Export named components (not default exports for components)
- Type all props with interfaces (suffix: `Props`)
- Use `type` for unions/primitives, `interface` for object shapes

### shadcn/ui Component Usage

**Import from @repo/ui:**

```typescript
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
```

**Component patterns:**

```typescript
// Buttons with variants
<Button variant="default">Save</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="outline">Edit</Button>

// Cards for content sections
<Card>
  <CardHeader>
    <CardTitle>Note Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Note content</p>
  </CardContent>
</Card>
```

**Do not install additional shadcn/ui components without adding them to the packages/ui package first.**

### Form Patterns

**Server Action Forms:**

```typescript
"use client";

import { createRowingSession } from "./actions";

export function AddNoteForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createRowingSession(formData);
    if (result.error) {
      console.error(result.error);
      // TODO: Show toast notification
      return;
    }
    // Handle success
  }

  return (
    <form action={handleSubmit}>
      <Input name="title" required />
      <Textarea name="description" />
      <Button type="submit">Create Note</Button>
    </form>
  );
}
```

**Progressive enhancement** - forms work without JavaScript via server actions.

## Styling Conventions

### Tailwind CSS Usage

**Utility-first approach:**

```typescript
<div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
  <h3 className="text-lg font-semibold">Title</h3>
  <Badge variant="secondary">Draft</Badge>
</div>
```

**Responsive design (mobile-first):**

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

**Class merging with cn() utility:**

```typescript
import { cn } from "@repo/ui/lib/utils";

<Button className={cn("w-full", isLoading && "opacity-50")}>Submit</Button>;
```

### Markdown Styling

For markdown content, use Tailwind Typography:

```typescript
<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

### Design System

**Spacing:** Use Tailwind spacing scale (p-4, gap-2, space-y-4)
**Colors:** Use semantic tokens (bg-card, text-foreground, border, muted)
**Icons:** Lucide React exclusively
**Typography:** Default Next.js font stack

## TypeScript Conventions

### Strict Mode Rules

- **No `any` types** - use `unknown` if type is truly unknown
- **Explicit return types** for functions
- **Null safety** - handle null/undefined explicitly

```typescript
// ✅ Good
async function getRowingSession(id: string): Promise<RowingSession | null> {
  const { data } = await supabase
    .from("rowingSessions")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}

// ❌ Bad
async function getRowingSession(id: string): Promise<any> {
  const { data } = await supabase
    .from("rowingSessions")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}
```

### Type Definitions

**Export types from action files:**

```typescript
"use server";

export type RowingSession = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export async function getRowingSessions(): Promise<RowingSession[]> {
  // Implementation
}
```

**Database types** - generate from Supabase schema when needed.

## Development Practices

### Error Handling

**Server actions:**

```typescript
export async function createRowingSession(formData: FormData) {
  try {
    const { error } = await supabase.from('rowingSessions').insert({...})

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to create note' }
    }

    revalidatePath('/dashboard/rowingSessions')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}
```

**Client components:**

```typescript
async function handleSubmit() {
  try {
    const result = await createRowingSession(formData);
    if (result.error) {
      // TODO: Replace console.error with toast notification
      console.error(result.error);
      return;
    }
    // Handle success
  } catch (err) {
    console.error("Client error:", err);
  }
}
```

### Cache Invalidation

After mutations, invalidate affected paths:

```typescript
import { revalidatePath } from "next/cache";

// Revalidate specific path
revalidatePath("/dashboard/rowingSessions");

// Revalidate with layout
revalidatePath("/dashboard/rowingSessions", "layout");

// Revalidate dynamic routes
revalidatePath(`/dashboard/rowingSessions/${rowingSessionId}`);
```

### Environment Variables

Required variables (in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Access in code:

```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
```

### Local Development

**Start local Supabase:**

```bash
cd packages/database
supabase start
```

**Run dev server:**

```bash
npm run dev
```

**Type checking:**

```bash
npm run check-types
```

### Migration Management

- Migrations in `packages/database/supabase/migrations/`
- Naming: `YYYYMMDDHHMMSS_description.sql`
- **Never edit migrations after deployment**
- Reset local database: `supabase db reset` (development only)

## What NOT to Do

❌ **Avoid:**

- Using `any` type in TypeScript
- Creating new state management libraries (Redux, Zustand) - Server Components reduce the need, but use React Context when needed, and Zustand only for complex client-side state
- Installing additional dependencies without discussing first
- Using Client Components when Server Components suffice
- Mixing Supabase client types (server vs browser client)
- Bypassing RLS policies with service role key
- Creating custom UI components when shadcn/ui components exist
- Styled-components (use Tailwind only, but if complex style are needed use css modules)
- Creating API routes for data fetching (use Server Components)
- Fetching data in Client Components (use Server Components instead)

## Code Quality

- **ESLint:** Zero warnings policy (`--max-warnings 0`)
- **Prettier:** Auto-formatting configured
- **Type safety:** Strict TypeScript mode enabled
- **Testing:** Not yet implemented (future enhancement)

## Feature Implementation Guidelines

When implementing new features:

1. **Plan the data model first** - update database schema if needed
2. **Create server actions** for mutations in route-specific `actions.ts`
3. **Build Server Components** for data fetching and layout
4. **Add Client Components** only for interactivity
5. **Use shadcn/ui components** for UI elements
6. **Style with Tailwind** utilities
7. **Handle errors gracefully** with user feedback
8. **Revalidate cache** after mutations
9. **Test authentication flow** - ensure proper redirects

## Future Considerations

The codebase is prepared for:

- **Dark mode** (Tailwind configured, not implemented)
- **Email invitations** for note sharing (schema ready)
- **Pagination UI** (backend ready with cursor-based pagination)
- **Real-time collaboration** (Supabase Realtime ready to integrate)
- **File attachments** (Supabase Storage available)

When implementing these, follow existing patterns and maintain consistency with current architecture.

---

**Last Updated:** January 9, 2026
**Next.js Version:** 16.1.1
**React Version:** 19
