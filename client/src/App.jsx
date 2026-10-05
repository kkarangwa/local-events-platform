import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Events from './pages/Events'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App