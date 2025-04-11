import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAccount, LoginCredentials, checkUsernameExists, checkLoginCredentials } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isLogin) {
        // Check if username exists in Supabase
        const exists = await checkUsernameExists(username);
        if (exists) {
          setError('Username already exists in database. Please choose a different username.');
          setIsLoading(false);
          return;
        }

        // First store in Supabase with container name
        const containerName = `user-${username}-container`;
        const credentials: LoginCredentials = {
          username,
          password,
          docker_container_id: containerName,
        };

        const { error: registrationError } = await createAccount(credentials);

        if (registrationError) {
          throw new Error('Failed to store in Supabase: ' + (registrationError as PostgrestError).message);
        }

        // Then create container with existing backend
        const containerResponse = await fetch('http://localhost:3000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        const containerData = await containerResponse.json();

        if (!containerResponse.ok) {
          throw new Error(containerData.error || 'Failed to create container');
        }

        onLogin(username);
        navigate('/terminal');
        return;
      }

      // Login logic - first check credentials in Supabase
      const { exists, passwordMatch } = await checkLoginCredentials(username, password);
      
      if (!exists) {
        setError('Username doesn\'t exist');
        setIsLoading(false);
        return;
      }

      if (!passwordMatch) {
        setError('Incorrect password');
        setIsLoading(false);
        return;
      }

      // If credentials are valid, proceed with backend login
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(username);
      navigate('/terminal');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Operation failed:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? 'Login' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              isLogin ? 'Logging in...' : 'Creating Account & Container...'
            ) : (
              isLogin ? 'Login' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={`text-blue-500 hover:text-blue-700 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}; 