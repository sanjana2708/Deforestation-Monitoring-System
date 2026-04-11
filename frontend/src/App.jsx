import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardMain from './pages/dashboard/DashboardMain'
import DashboardGeo from './pages/dashboard/DashboardGeo'
import DashboardCnn from './pages/dashboard/DashboardCnn'
import DashboardAlerts from './pages/dashboard/DashboardAlerts'
import PlaceholderPage from './pages/PlaceholderPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/about" element={<PlaceholderPage title="About Us" />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardMain />} />
          <Route path="geo" element={<DashboardGeo />} />
          <Route path="cnn" element={<DashboardCnn />} />
          <Route path="alerts" element={<DashboardAlerts />} />
        </Route>
        <Route path="/monitor" element={<Navigate to="/dashboard" replace />} />
        <Route path="/contact" element={<PlaceholderPage title="Contact" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
