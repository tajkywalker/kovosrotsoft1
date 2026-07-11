import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Pridat from './pages/Pridat.jsx';
import Prehled from './pages/zaznamy/Prehled.jsx';
import Seznam from './pages/zaznamy/Seznam.jsx';
import Overeni from './pages/zaznamy/Overeni.jsx';
import ZapisModal from './pages/Zapis.jsx';

export default function App() {
  const [showZapis, setShowZapis] = useState(false);

  return (
    <>
      <Layout onOpenZapis={() => setShowZapis(true)}>
        <Routes>
          <Route path="/"                  element={<Navigate to="/zaznamy/prehled" replace />} />
          <Route path="/pridat"            element={<Pridat />} />
          <Route path="/zaznamy/prehled"   element={<Prehled />} />
          <Route path="/zaznamy/seznam"    element={<Seznam />} />
          <Route path="/zaznamy/overeni"   element={<Overeni />} />
          <Route path="*"                  element={<Navigate to="/zaznamy/prehled" replace />} />
        </Routes>
      </Layout>

      {showZapis && <ZapisModal onClose={() => setShowZapis(false)} />}
    </>
  );
}
