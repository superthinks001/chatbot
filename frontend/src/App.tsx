import React from 'react';
import ChatWidget from './components/ChatWidget';
import BiasLogsAdmin from './components/BiasLogsAdmin';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const path = window.location.pathname;
  if (path === '/admin') return <AdminDashboard />;
  if (path === '/admin/bias-logs') return <BiasLogsAdmin />;

  return (
    <div>
      <header>
        <h1>Aldeia Advisor</h1>
      </header>
      <ChatWidget />
    </div>
  );
};

export default App;
