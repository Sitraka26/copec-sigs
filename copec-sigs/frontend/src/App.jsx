import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Eleves from './pages/Eleves';
import Classes from './pages/Classes';
import Inscriptions from './pages/Inscriptions';
import Enseignants from './pages/Enseignants';
import Notes from './pages/Notes';
import Bulletins from './pages/Bulletins';
import Presences from './pages/Presences';
import Paiements from './pages/Paiements';
import EmploiDuTemps from './pages/EmploiDuTemps';
import Programme from './pages/Programme';
import Rapports from './pages/Rapports';
import Parametres from './pages/Parametres';
import Niveaux from './pages/Niveaux';
import MonCompte from './pages/MonCompte';
import Messages from './pages/Messages';
import Layout from './components/Layout';
import RouteProtegee from './components/RouteProtegee';
import JournalActivite from './pages/JournalActivite';
import Certificats from './pages/Certificats';
import Discipline from './pages/Discipline';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
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
          <Route path="/enseignants" element={<Enseignants />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/bulletins" element={<Bulletins />} />
          <Route path="/presences" element={<Presences />} />
          <Route path="/paiements" element={<Paiements />} />
          <Route path="/emploi-du-temps" element={<EmploiDuTemps />} />
          <Route path="/programme" element={<Programme />} />
          <Route path="/niveaux" element={<Niveaux />} />
          <Route path="/rapports" element={<Rapports />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/mon-compte" element={<MonCompte />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/journal" element={<JournalActivite />} />
          <Route path="/certificats" element={<Certificats />} />
          <Route path="/discipline" element={<Discipline />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}