import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => setClasses(data))
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-6">Classes</h1>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      {chargement ? (
        <p className="text-gray-500">Chargement...</p>
      ) : classes.length === 0 ? (
        <p className="text-gray-500">Aucune classe créée pour l'instant.</p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Niveau</th>
                <th className="px-4 py-2">Cycle</th>
                <th className="px-4 py-2">Effectif</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classe) => (
                <tr key={classe.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{classe.nom}</td>
                  <td className="px-4 py-2">
                    {classe.niveau.libelle}
                    {classe.niveau.filiere ? ` - ${classe.niveau.filiere}` : ''}
                  </td>
                  <td className="px-4 py-2">{classe.niveau.cycle}</td>
                  <td className="px-4 py-2">{classe._count?.inscriptions ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
