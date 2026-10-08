import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import MarketPage from './pages/MarketPage';
import TradePage from './pages/TradePage';
import PortfolioPage from './pages/PortfolioPage';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-[#0b0e11] text-white flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/trade/:pair" element={<TradePage />} />
          <Route path="/portfolio" element={
            <ProtectedRoute>
              <PortfolioPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
