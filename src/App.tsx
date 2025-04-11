import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/LoginPage';
import { Terminal } from './components/Terminal';

function App() {
    const [username, setUsername] = useState<string | null>(null);

    const handleLogin = (username: string) => {
        setUsername(username);
    };

    const handleLogout = () => {
        setUsername(null);
    };

    return (
        <Router>
            <Routes>
                <Route 
                    path="/" 
                    element={
                        username ? (
                            <Navigate to="/terminal" replace />
                        ) : (
                            <LoginPage onLogin={handleLogin} />
                        )
                    } 
                />
                <Route 
                    path="/terminal" 
                    element={
                        username ? (
                            <Terminal username={username} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    } 
                />
            </Routes>
        </Router>
    );
}

export default App;