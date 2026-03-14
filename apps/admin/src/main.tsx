// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login.tsx'
import Home from './pages/Home.tsx'
import Problems from './pages/Problems.tsx'
import ContestCreate from './pages/ContestCreate.tsx'
import ContestLobby from './pages/ContestLobby.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Results from './pages/Results.tsx'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = localStorage.getItem('bc_admin_token')
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/problems" element={<PrivateRoute><Problems /></PrivateRoute>} />
        <Route path="/contest/new" element={<PrivateRoute><ContestCreate /></PrivateRoute>} />
        <Route path="/contest/lobby/:contestId" element={<PrivateRoute><ContestLobby /></PrivateRoute>} />
        <Route path="/dashboard/:contestId" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/results/:contestId" element={<PrivateRoute><Results /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
