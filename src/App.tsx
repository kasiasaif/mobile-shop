import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminMoved } from './pages/AdminMoved'
import { About } from './pages/About'
import { Cart } from './pages/Cart'
import { Contact } from './pages/Contact'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Shop } from './pages/Shop'
import { Terms } from './pages/Terms'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/work" element={<Navigate to="/shop" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin" element={<AdminMoved />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
