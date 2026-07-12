import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Pridat from './pages/Pridat.jsx';
import Prehled from './pages/zaznamy/Prehled.jsx';
import Seznam from './pages/zaznamy/Seznam.jsx';
import Overeni from './pages/zaznamy/Overeni.jsx';
import Log from './pages/Log.jsx';
import Konvertor from './pages/Konvertor.jsx';
import ZapisModal from './pages/Zapis.jsx';

export default function App() {
  const [token,     setToken]     = useState(() => localStorage.getItem('kss_token'));
  const [showZapis, setShowZapis] = useState(false);

  const handleLogin  = (tok) => setToken(tok);
  const handleLogout = () => {
    localStorage.removeItem('kss_token');
    localStorage.removeItem('kss_user');
    setToken(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <>
      <Layout onOpenZapis={() => setShowZapis(true)} onLogout={handleLogout}>
        <Routes>
          <Route path="/"                element={<Navigate to="/zaznamy/prehled" replace />} />
          <Route path="/pridat"          element={<Pridat />} />
          <Route path="/zaznamy/prehled" element={<Prehled />} />
          <Route path="/zaznamy/seznam"  element={<Seznam />} />
          <Route path="/zaznamy/overeni" element={<Overeni />} />
          <Route path="/konvertor"       element={<Konvertor />} />
          <Route path="/log"             element={<Log />} />
          <Route path="*"                element={<Navigate to="/zaznamy/prehled" replace />} />
        </Routes>
      </Layout>
      {showZapis && <ZapisModal onClose={() => setShowZapis(false)} />}
    </>
  );
}
