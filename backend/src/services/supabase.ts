import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  username: string;
  containerId?: string;
}

export async function getUser(username: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('login_creds')
      .select('username, docker_container_id')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return {
      username: data.username,
      containerId: data.docker_container_id
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('login_creds')
      .select('username, docker_container_id, password')
      .eq('username', username)
      .single();

    if (error || !data || data.password !== password) {
      return null;
    }

    return {
      username: data.username,
      containerId: data.docker_container_id
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

export async function updateUserContainer(username: string, containerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('login_creds')
      .update({ docker_container_id: containerId })
      .eq('username', username);

    if (error) {
      console.error('Error updating container ID:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating container ID:', error);
    return false;
  }
} 