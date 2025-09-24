# Environment Setup

## Supabase Configuration

To use the full functionality of this application, you need to configure Supabase:

1. **Create a Supabase project** at [https://app.supabase.com/](https://app.supabase.com/)

2. **Get your project credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the Project URL and anon/public key

3. **Update the environment variables**:
   - Rename `frontend/.env.example` to `frontend/.env`
   - Replace the placeholder values with your actual Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-actual-anon-key
     ```

## Development Mode

The application will work in development mode even without proper Supabase credentials configured, but authentication and data persistence will not function correctly.

## Quick Start

1. Install dependencies: `npm run install-deps`
2. Start development server: `npm run dev`
3. Open [http://localhost:5173](http://localhost:5173) in your browser

The application will display warnings in the console about missing Supabase configuration, but will not crash.