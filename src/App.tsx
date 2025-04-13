import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/LoginPage';
import { Terminal } from './components/Terminal';
import { GateKeeper } from './components/GateKeeper';

function App() {
    const [username, setUsername] = useState<string | null>(null);
    const [hasAccess, setHasAccess] = useState<boolean>(false);

    const handleLogin = (username: string) => {
        setUsername(username);
    };

    const handleLogout = () => {
        setUsername(null);
    };

    const handleAccess = () => {
        setHasAccess(true);
    };

    return (
        <Router>
            <Routes>
                <Route 
                    path="/" 
                    element={
                        !hasAccess ? (
                            <GateKeeper onAccess={handleAccess} />
                        ) : username ? (
                            <Navigate to="/terminal" replace />
                        ) : (
                            <LoginPage onLogin={handleLogin} />
                        )
                    } 
                />
                <Route 
                    path="/terminal" 
                    element={
                        !hasAccess ? (
                            <Navigate to="/" replace />
                        ) : username ? (
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