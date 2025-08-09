# Setup Instructions

## 🎯 Quick Setup Guide

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
```

### 2. Supabase Setup

1. **Create Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to finish setting up

2. **Get API Keys**
   - Go to Settings > API
   - Copy the Project URL and anon/public key
   - Copy the service_role key (keep this secret!)

3. **Create Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy the entire contents of `supabase/schema.sql`
   - Paste and run the query

4. **Enable Realtime** (if not already enabled)
   - Go to Database > Replication
   - Enable realtime for the tables: `rooms`, `players`, `rounds`, `votes`

### 3. Generate JWT Secret

Use any of these methods to generate a secure JWT secret:

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: OpenSSL
https://mgbtdolqfhwgsukayysw.supabase.co

# Option 3: Online generator
# Visit: https://generate-secret.now.sh/64
```

### 4. Test the Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and try:
1. Creating a room
2. Joining with another browser tab
3. Starting a game

## 🚀 Deployment

### Vercel Deployment

1. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Navigate to your project > Settings > Environment Variables
   - Add all the environment variables from your `.env.local`

3. **Custom Domain** (optional)
   - Add your custom domain in Vercel settings
   - Update CORS settings in Supabase if needed

### Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- [ ] `JWT_SECRET` - Random secret for JWT signing (server-only)

## 🔧 Troubleshooting

### Common Issues

1. **"Room not found" errors**
   - Check if database schema was applied correctly
   - Verify RLS policies are enabled

2. **Players not appearing**
   - Check if realtime is enabled for the `players` table
   - Verify WebSocket connection in browser dev tools

3. **JWT token errors**
   - Make sure `JWT_SECRET` is set and consistent
   - Check if the secret is long enough (recommended: 64+ characters)

4. **API route errors**
   - Verify all environment variables are set
   - Check Supabase service role key permissions

### Database Reset

If you need to reset the database:

```sql
-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS presence CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Then re-run the schema from supabase/schema.sql
```

## 📱 PWA Installation

The app is configured as a Progressive Web App (PWA):

1. **Mobile**: Open in browser, tap "Add to Home Screen"
2. **Desktop**: Look for install prompt or use browser menu
3. **Icons**: Place app icons in `/public/` as `icon-192x192.png` and `icon-512x512.png`

## 🎮 Game Testing

For testing with multiple players:

1. **Local**: Open multiple browser tabs/windows
2. **Network**: Use different devices on the same network
3. **Incognito**: Use incognito/private browsing modes
4. **Mobile**: Test on actual mobile devices for touch interactions

## 📊 Monitoring

- **Supabase Dashboard**: Monitor database usage and API calls
- **Vercel Analytics**: Track page views and performance
- **Browser DevTools**: Debug realtime connections and API calls

---

🎉 **You're all set!** The Impostor game should now be fully functional with real-time multiplayer gameplay.
