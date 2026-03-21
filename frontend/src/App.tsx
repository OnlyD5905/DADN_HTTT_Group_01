import { Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import FEASolver from './pages/FEASolver'
import Results from './pages/Results'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/solver" element={<FEASolver />} />
      <Route path="/results" element={<Results />} />
    </Routes>
  )
}

export default App
