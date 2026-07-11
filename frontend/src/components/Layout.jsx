import Sidebar from './Sidebar.jsx';

export default function Layout({ children, onOpenZapis }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onOpenZapis={onOpenZapis} />
      <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
        {children}
      </main>
    </div>
  );
}
