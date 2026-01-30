# Database Package

Minimal Supabase configuration package for the Rowing monorepo.

## Setup

To initialize Supabase for local development:

```bash
cd packages/database
supabase init
supabase start
```

## Scripts

- `npm run start` - Start local Supabase instance
- `npm run stop` - Stop local Supabase instance
- `npm run status` - Check Supabase status
- `npm run reset` - Reset local database

## Future Enhancements

- Database migrations
- Seed data
- Type generation
- Row Level Security policies
