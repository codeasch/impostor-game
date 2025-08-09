# Impostor Game 🎭

A real-time multiplayer social deduction game where players try to identify the impostor among them. Built with Next.js, Supabase, and modern web technologies for a smooth, engaging experience.

## 🎮 How to Play

### Game Overview
- **3-20 players** join a room using a 6-character room code
- One player becomes the **impostor** while others are **innocent**
- Everyone gets a secret word card - but the impostor gets something different
- Through discussion and voting, players try to identify the impostor

### Game Flow
1. **Join Room**: Enter room code and your name
2. **Host Settings**: Choose word pack, game mode, and discussion timer
3. **Reveal Cards**: Each player sees their secret role and word
4. **Discussion**: Talk about your words (without saying them directly!)
5. **Voting**: Vote to eliminate who you think is the impostor
6. **Results**: See who won and play again!

### Game Modes
- **Blank Cards**: Impostor sees "?" - classic mode
- **Deception Mode**: Impostor gets a similar word but thinks they're innocent (mind games!)

### Word Packs
- Classic everyday items
- Animals
- Food & drinks  
- Places
- Movies

## 🚀 Features

### Real-time Multiplayer
- **Instant updates** across all devices
- **Room codes** for easy joining
- **Host controls** for game management
- **Persistent settings** between rounds

### Smooth Gameplay
- **Preloaded assignments** for instant card reveals
- **Auto-advancing phases** when all players are ready
- **Smart timers** with visual countdown
- **Fast voting** with immediate results

### Modern UI/UX
- **Clean, minimal design** optimized for mobile
- **Smooth animations** with Framer Motion
- **Dark theme** by default
- **Responsive** across all screen sizes
- **Touch-friendly** interface

## 🛠 Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** for animations
- **Zustand** for state management

### Backend & Database
- **Supabase** (PostgreSQL + Real-time)
- **Row Level Security** for data protection
- **JWT authentication** for players
- **Edge Functions** for game logic

### Deployment
- **Vercel** for frontend hosting
- **Supabase** cloud for backend
- **Environment variables** for configuration

## 🏗 Project Structure

```
impostor-game/
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── api/             # API routes
│   │   ├── room/[code]/     # Game room page
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── game/           # Game-specific components
│   │   └── ui/             # Reusable UI components
│   ├── lib/                # Utilities and configs
│   ├── stores/             # Zustand state management
│   └── types/              # TypeScript definitions
├── public/
│   └── packs/              # Word pack JSON files
├── supabase/
│   └── schema.sql          # Database schema
└── ...config files
```

## 🎯 Key Components

### Game Phases
- **Lobby**: Player joining and host settings
- **Reveal**: Secret role and word assignment
- **Discussion**: Timed conversation phase
- **Voting**: Secret ballot elimination
- **Results**: Winner reveal and play again

### Real-time Features
- **1-second polling** for room/player updates
- **Supabase broadcasts** for settings changes
- **Auto-advance** when all players ready/voted
- **Instant feedback** on all actions

### Smart Optimizations
- **Assignment preloading** for instant reveals
- **Efficient polling** to minimize API calls
- **State persistence** between rounds
- **Graceful error handling**

## 🎨 Design Philosophy

### User Experience
- **Zero loading delays** where possible
- **Clear visual feedback** for all actions
- **Intuitive navigation** and controls
- **Accessible** color schemes and typography

### Performance
- **Optimized API calls** with smart caching
- **Minimal bundle size** with code splitting
- **Fast page loads** with static generation
- **Efficient real-time updates**

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd impostor-game

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase keys and JWT secret

# Run database migrations
# Execute supabase/schema.sql in your Supabase SQL editor

# Start development server
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
```

## 🎲 Game Logic

### Role Assignment
- Randomly selects 1 impostor from connected players
- Assigns crew word to innocent players
- Gives impostor either "?" or deception word
- Stores assignments securely in database

### Voting System
- Secret ballot voting
- Auto-advance when all votes cast
- Tie handling (no elimination)
- Real-time vote counting

### Win Conditions
- **Innocent win**: Successfully vote out the impostor
- **Impostor win**: Avoid being voted out

## 📱 Mobile Optimization

- **Touch-friendly** button sizes (44px minimum)
- **Responsive design** for all screen sizes
- **Portrait orientation** optimized
- **Fast tap responses** with visual feedback
- **Smooth animations** at 60fps

## 🔒 Security

- **JWT tokens** for player authentication
- **Row Level Security** in Supabase
- **Rate limiting** on API endpoints
- **Input validation** on all user data
- **Secure assignment** distribution

## 🚀 Deployment

### Vercel Deployment
```bash
# Deploy to Vercel
npm run build
vercel --prod
```

### Environment Configuration
- Set all environment variables in Vercel dashboard
- Configure Supabase RLS policies
- Test with production database

## 🎊 Future Enhancements

- Multiple impostor support
- Custom word packs
- Player avatars
- Game statistics
- Tournament mode
- Voice chat integration

---

Built with ❤️ for social gaming enthusiasts. Perfect for parties, team building, or just having fun with friends!