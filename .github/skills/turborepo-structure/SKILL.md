---
name: turborepo-structure
description: Guide for adding new apps and packages to this TurboRepo monorepo. Use this when creating new Next.js applications, shared packages, config packages, UI libraries, or any other workspace packages. Covers directory structure, naming conventions, workspace dependencies, and TurboRepo pipeline configuration.
---

# TurboRepo Monorepo Structure

This skill guides you through adding new applications and packages to the TurboRepo monorepo using npm workspaces.

## Monorepo Structure Overview

```
rowing/
├── apps/                    # Independent applications
│   └── rowing/             # Main Next.js 16 application
├── packages/               # Shared, consumable packages
│   ├── database/          # Supabase config, migrations, seed data
│   ├── ui/                # shadcn/ui component library
│   ├── typescript-config/ # Shared TypeScript configurations
│   └── eslint-config/     # Shared ESLint configurations
├── turbo.json             # TurboRepo pipeline configuration
└── package.json           # Root workspace configuration
```

## Package Naming Conventions

All internal packages use the `@repo/` scope:

- **UI Components**: `@repo/ui`
- **Config Packages**: `@repo/typescript-config`, `@repo/eslint-config`
- **Database**: `@repo/database`
- **Shared Utilities**: `@repo/utils`, `@repo/logger`, etc.
- **API Clients**: `@repo/api-client`
- **Testing Libraries**: `@repo/test-utils`

## When to Create an App vs. Package

### Create an App (`apps/`) when:

- Building an independent, deployable application
- The code represents a user-facing product
- It needs its own routing, pages, and application logic
- Example: Next.js applications, mobile apps, CLI tools

### Create a Package (`packages/`) when:

- Code will be shared across multiple apps
- Building reusable UI components
- Creating shared configuration (TypeScript, ESLint, Tailwind)
- Managing database schemas and migrations
- Building utility functions or API clients

---

## Adding a New App

Apps are independent, deployable applications (Next.js apps, CLIs, mobile apps, etc.).

### 1. Create App Directory

```bash
mkdir -p apps/your-app-name/src
cd apps/your-app-name
```

### 2. Initialize package.json

Create a `package.json` with:

- **Name:** Use app name directly (e.g., `"your-app-name"`, not `@repo/your-app-name`)
- **Scripts:** Include `dev`, `build`, `start`, `lint`, `check-types`
- **Dependencies:** External packages (Next.js, React, etc.) plus internal packages using `workspace:*`
- **Private:** Always set `"private": true"`

**Example for Next.js app:**

```json
{
  "name": "your-app-name",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^16.1.1",
    "react": "^19.0.0",
    "@repo/ui": "workspace:*",
    "@repo/database": "workspace:*"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

### 3. Configure TypeScript

Create `tsconfig.json` extending shared configuration:

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 4. Configure ESLint

Create `.eslintrc.js` extending shared configuration:

```javascript
module.exports = {
  extends: ["@repo/eslint-config/next.js"],
};
```

### 5. App-Specific Configuration

Add any framework-specific config files (e.g., `next.config.ts`, `tailwind.config.ts`, etc.):

**Important for Next.js:** Add workspace packages to `transpilePackages`:

```typescript
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/utils"],
};
```

### 6. Run npm install

From workspace root:

```bash
npm install
```

This links all workspace packages automatically.

---

## Adding a New Package

Packages are shared, consumable code used across multiple apps (UI components, utilities, configs, etc.).

### 1. Create Package Directory

```bash
mkdir -p packages/package-name/src
cd packages/package-name
```

### 2. Initialize package.json

Create a `package.json` with:

- **Name:** Use `@repo/` scope (e.g., `"@repo/ui"`, `"@repo/utils"`)
- **Version:** Start with `"0.1.0"`
- **Private:** Always set `"private": true"` (not published to npm)
- **Exports:** Define module entry points for granular imports
- **Scripts:** Include `lint`, `check-types`, and optionally `test` or `build`
- **Dependencies:** Only what the package needs
- **DevDependencies:** Include `@repo/typescript-config` and `@repo/eslint-config`
- **PeerDependencies:** For packages that require React or other frameworks

**Example for a utilities package:**

```json
{
  "name": "@repo/utils",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./date": "./src/date.ts",
    "./format": "./src/format.ts"
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

**Example for a React component library:**

```json
{
  "name": "@repo/ui",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.9.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### 3. Configure TypeScript

Create `tsconfig.json` extending shared configuration:

```json
{
  "extends": "@repo/typescript-config/react-library.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Configure ESLint

Create `.eslintrc.js` extending shared configuration:

```javascript
module.exports = {
  extends: ["@repo/eslint-config/react-library.js"],
};
```

### 5. Create Package Source Files

Organize your package code in `src/` directory according to your exports.

### 6. Run npm install

From workspace root:

```bash
npm install
```

### Common Package Types

#### Configuration Packages

**Examples:** `@repo/typescript-config`, `@repo/eslint-config`

- No `src/` directory - just config files
- No scripts needed (no build, lint, or type checking)
- List config files in `files` field

#### UI Component Libraries

**Examples:** `@repo/ui`, `@repo/design-system`

- React components in `src/`
- Use `exports` for granular imports
- Include `peerDependencies` for React
- No build step (transpiled by consuming apps)

#### Utility Libraries

**Examples:** `@repo/utils`, `@repo/logger`, `@repo/validators`

- Pure TypeScript/JavaScript functions
- Use `exports` for tree-shaking
- No framework dependencies

#### Database/Backend Packages

**Examples:** `@repo/database`, `@repo/api-client`

- May include scripts for database operations
- Can have special directory structures (migrations, seeds)
- Type generation scripts

#### Testing Packages

**Examples:** `@repo/test-utils`, `@repo/test-config`

- Shared test helpers, mocks, fixtures
- Testing library dependencies

---

## TurboRepo Pipeline Configuration

### Root `turbo.json`

Configure task dependencies and caching:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "check-types": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:start": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Pipeline Task Patterns:**

- `^build` means "run build in dependencies first"
- `cache: false` for non-deterministic tasks (dev servers, databases)
- `persistent: true` for long-running processes
- `outputs` defines what to cache

### Root `package.json` Workspaces

```json
{
  "name": "rowing",
  "version": "0.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.7.2",
    "prettier": "^3.7.0",
    "eslint": "^9.0.0"
  },
  "packageManager": "npm@11.0.0",
  "engines": {
    "node": ">=24.0.0",
    "npm": ">=11.0.0"
  }
}
```

---

## Common Commands

### Development

```bash
# Run all apps in dev mode
npm run dev

# Run specific package in dev mode
npm run dev --filter=rowing

# Run dev for specific package and its dependencies
npm run dev --filter=rowing...
```

### Building

```bash
# Build all packages and apps
npm run build

# Build specific package
npm run build --filter=@repo/ui

# Build package and everything that depends on it
npm run build --filter=...@repo/ui
```

### Type Checking and Linting

```bash
# Check types across workspace
npm run check-types

# Lint all packages
npm run lint

# Lint specific package
npm run lint --filter=@repo/ui
```

### Installing Dependencies

```bash
# Install dependency in specific app
npm install <package> --workspace=rowing

# Install dependency in specific package
npm install <package> --workspace=@repo/ui

# Install dev dependency in root
npm install <package> -D -w
```

### Adding Internal Dependencies

```bash
# Add @repo/ui to rowing app
cd apps/rowing
npm install @repo/ui@workspace:*
```

Or manually edit `package.json`:

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

Then run `npm install` from root.

---

## Best Practices

### 1. Workspace Protocol

Always use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

### 2. Package Scope

All internal packages use `@repo/` scope for clarity:

- ✅ `@repo/ui`
- ✅ `@repo/utils`
- ❌ `ui` (confusing with external packages)

### 3. Granular Exports

Use `exports` field for tree-shaking and explicit API:

```json
{
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  }
}
```

Import as:

```typescript
import { Button } from "@repo/ui/button";
```

### 4. TypeScript Configuration Inheritance

Extend shared configs to maintain consistency:

```json
{
  "extends": "@repo/typescript-config/nextjs.json"
}
```

### 5. Transpile Internal Packages

In Next.js apps, transpile workspace packages:

```typescript
// next.config.ts
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/utils"],
};
```

### 6. No Build Step for Simple Packages

For TypeScript-only packages consumed by Next.js, skip the build step. Let consuming apps transpile the source directly.

### 7. Peer Dependencies

For React components, use `peerDependencies`:

```json
{
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### 8. Task Naming Consistency

Use consistent script names across packages:

- `dev` - Development server
- `build` - Production build
- `lint` - ESLint
- `check-types` - TypeScript type checking
- `test` - Run tests

### 9. Private Packages

Mark all internal packages as private:

```json
{
  "private": true
}
```

### 10. Cache Outputs

Define outputs in `turbo.json` for effective caching:

```json
{
  "tasks": {
    "build": {
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

---

## Troubleshooting

### "Cannot find module '@repo/ui'"

**Solution:** Run `npm install` from workspace root to link packages.

### Changes in @repo/ui not reflected in app

**Solution 1:** Restart dev server.

**Solution 2:** Add package to `transpilePackages` in `next.config.ts`:

```typescript
transpilePackages: ["@repo/ui"];
```

### Type errors in workspace packages

**Solution:** Run `npm run check-types` to see detailed errors. Ensure all packages extend from `@repo/typescript-config`.

### Turbo cache issues

**Solution:** Clear cache:

```bash
npx turbo clean
```

### Circular dependencies

**Solution:** Restructure packages. Packages should not depend on each other in cycles. Consider creating a new shared package for common code.

---

## Migration Checklist

When adding a new app or package, verify:

- [ ] Directory created in `apps/` or `packages/`
- [ ] `package.json` with correct name and `workspace:*` dependencies
- [ ] `tsconfig.json` extending shared config
- [ ] `.eslintrc.js` extending shared config
- [ ] Added to `turbo.json` if special pipeline needs
- [ ] Run `npm install` from root
- [ ] Scripts (`dev`, `build`, `lint`, `check-types`) work
- [ ] Imports from other workspace packages work
- [ ] Type checking passes (`npm run check-types`)
- [ ] Linting passes (`npm run lint`)

---

## Additional Resources

- [TurboRepo Documentation](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces)
- [Next.js Monorepo](https://nextjs.org/docs/app/building-your-application/configuring/typescript#packages)
