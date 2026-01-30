# Rowing

A rowing application for tracking rowing activities with single and multiplayer live sessions.

## Tech Stack

- **Next.js 16.1.1** with App Router and React 19
- **TypeScript 5.9+** in strict mode
- **Turborepo 2.7.2** for monorepo orchestration
- **Supabase** for backend and authentication
- **Tailwind CSS 4** for styling
- **shadcn/ui** component library

## Prerequisites

- Node.js >= 24.0.0
- npm >= 11.0.0
- Supabase CLI (for local development)

## Getting Started

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example apps/rowing/.env.local
# Edit apps/rowing/.env.local with your Supabase credentials
```

3. **Run development server:**

```bash
npm run dev
```

4. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000)

## Monorepo Structure

```
rowing/
├── apps/
│   └── rowing/          # Main Next.js application
├── packages/
│   ├── database/        # Supabase configuration
│   ├── ui/              # Shared UI components (shadcn/ui)
│   ├── typescript-config/ # Shared TypeScript configs
│   └── eslint-config/   # Shared ESLint configs
```

## Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build all apps and packages
- `npm run lint` - Lint all packages
- `npm run check-types` - Type check all packages
- `npm run format` - Format code with Prettier

## Development

For detailed development guidelines, see [.github/copilot-instructions.md](.github/copilot-instructions.md).
