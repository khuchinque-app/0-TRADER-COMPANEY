import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import MarketPage from './pages/MarketPage'
import LandingPage from './pages/LandingPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/trade/:symbol" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
