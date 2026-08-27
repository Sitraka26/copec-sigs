import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Eleves from './pages/Eleves';
import Classes from './pages/Classes';
import Inscriptions from './pages/Inscriptions';
import Notes from './pages/Notes';
import Presences from './pages/Presences';
import Paiements from './pages/Paiements';
import Layout from './components/Layout';
import RouteProtegee from './components/RouteProtegee';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RouteProtegee>
              <Layout />
            </RouteProtegee>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/eleves" element={<Eleves />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/inscriptions" element={<Inscriptions />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/presences" element={<Presences />} />
          <Route path="/paiements" element={<Paiements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}