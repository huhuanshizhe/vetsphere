# Remote Guidance Deployment Notes

## App

- Workspace: `apps/remote-guidance`
- Local dev: `pnpm run dev:guidance`
- Production build: `pnpm run build:guidance`

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## Current Runtime Flow

1. User enters `/guidance`
2. Auth state is read from the shared Supabase session
3. Session creation writes to `guidance_sessions`
4. Room open calls LiveKit RoomService API
5. Token route signs a real LiveKit JWT
6. `/guidance/:id/room` can connect to the LiveKit room

## Production Checklist

- Create a dedicated deployment target for `apps/remote-guidance`
- Bind production domain such as `guidance.vetsphere.cn`
- Set the six environment variables above in the hosting platform
- Verify doctor-approved account can:
  - create a session
  - open a room
  - request token
  - enter `/guidance/:id/room`
- Verify LiveKit cloud dashboard shows the room being created
- Add TLS/domain and callback allowlists if needed

## Database

- Production migration already applied:
  - `20260416000001_create_remote_guidance_tables`

## Next Build Check

- `pnpm --filter vetsphere-remote-guidance build`
- `pnpm --filter vetsphere-remote-guidance typecheck`
