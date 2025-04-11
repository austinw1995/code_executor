import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { app, httpServer } from './server';

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables loaded:', {
    supabaseUrl: process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set',
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
  });
}); 