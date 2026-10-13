import React, { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Icon from './components/Icon';

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="app-loading">
        <span className="loading-mark"><Icon name="code" size={24} /></span>
        <p>Getting your workspace ready…</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {!user ? <Auth /> : <Dashboard />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
