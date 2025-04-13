import React, { useState } from 'react';

interface GateKeeperProps {
    onAccess: () => void;
}

export const GateKeeper: React.FC<GateKeeperProps> = ({ onAccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    // Read master password from environment variable
    const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!MASTER_PASSWORD) {
            setError('Master password not configured');
            return;
        }
        if (password === MASTER_PASSWORD) {
            onAccess();
        } else {
            setError('Incorrect master password');
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    Access Required
                </h2>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Master Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            required
                            placeholder="Enter master password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none"
                    >
                        Access Application
                    </button>
                </form>
            </div>
        </div>
    );
}; 