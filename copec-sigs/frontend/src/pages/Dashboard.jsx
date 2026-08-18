export default function Dashboard() {
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium">Bienvenue{utilisateur ? `, ${utilisateur.prenom}` : ''}</h1>
      <p className="text-gray-600 mt-2">Tableau de bord SIGS COPEC — à construire (élèves, notes, paiements, présences).</p>
    </div>
  );
}
