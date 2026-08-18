import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RouteProtegee from './components/RouteProtegee';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RouteProtegee>
              <Dashboard />
            </RouteProtegee>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
