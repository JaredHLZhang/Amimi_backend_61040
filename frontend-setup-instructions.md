# Frontend Setup Instructions

## Step 1: Create GitHub Repository

1. Go to GitHub.com in your browser
2. Click "New repository" 
3. Name it `Amimi-frontend` (or your preferred name)
4. Make it public or private as you prefer
5. Don't initialize with README, .gitignore, or license (we'll set up Vue.js)
6. Click "Create repository"

## Step 2: Clone and Setup Locally

Once you've created the repository, run these commands in a new terminal:

```bash
# Navigate to your desired directory (outside the backend project)
cd /Users/jared/Desktop/

# Clone your new repository
git clone https://github.com/YOUR_USERNAME/Amimi-frontend.git
cd Amimi-frontend

# Initialize Vue.js project
npm create vue@latest .

# Select these options when prompted:
# - Project name: amimi-frontend
# - TypeScript: Yes
# - JSX: No  
# - Vue Router: Yes
# - Pinia: Yes (for state management)
# - Vitest: Yes (for testing)
# - ESLint: Yes
# - Prettier: Yes

# Install dependencies
npm install

# Start development server
npm run dev
```

## Step 3: Copy API Spec

Copy the `design/api-spec.md` file from your backend project to `src/api/api-spec.md` in the frontend project.

## Step 4: Notify Completion

Once you've completed these steps, let me know and I'll continue with the frontend implementation!

## What We'll Build Next

After the Vue.js setup is complete, I'll help you create:

1. **API Client Setup** - HTTP client for backend communication
2. **Pinia Store** - User state management with localStorage
3. **Core Components**:
   - `PairingView.vue` - Generate and accept pairing codes
   - `ChatView.vue` - Private chat with Amimi
4. **Router Views**:
   - `HomeView.vue` - Welcome and signup
   - `PairingView.vue` - Pairing interface
   - `PrivateChatView.vue` - Chat interface
5. **Integration Testing** - Full user journey testing

The MVP will focus on the core user journey: Sign up → Pair with partner → Private chat with Amimi.
