import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <ChatInterface user={user} onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;