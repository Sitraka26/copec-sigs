const LIBELLES_TYPE_FRAIS = {
  DROIT: "Droit d'inscription",
  ECOLAGE: 'Écolage',
  FRAIS_EXAMEN: "Frais d'examen",
  AUTRE: 'Autre',
};

function formatMontant(n) {
  return Number(n).toLocaleString('fr-FR') + ' Ar';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * data attendu : { etablissement, paiement, eleve, classe }
 */
function genererHtmlRecu(data) {
  const { etablissement, paiement, eleve, classe } = data;

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: A5; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; }
      .entete { text-align: center; margin-bottom: 16px; }
      .entete .etablissement { font-size: 16px; font-weight: bold; }
      .titre { text-align: center; font-size: 18px; font-weight: bold; margin: 16px 0; text-decoration: underline; }
      .numero { text-align: right; font-weight: bold; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      td { padding: 6px 4px; border-bottom: 1px solid #ccc; }
      td.label { color: #555; width: 40%; }
      td.valeur { font-weight: 600; }
      .montant-box { margin-top: 20px; border: 2px solid #333; padding: 12px; text-align: center; }
      .montant-box .montant { font-size: 22px; font-weight: bold; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
      .signatures .bloc { text-align: center; width: 40%; border-top: 1px solid #333; padding-top: 4px; }
    </style>
  </head>
  <body>
    <div class="entete">
      <div class="etablissement">${etablissement.nom}</div>
      ${etablissement.telephone ? `<div>${etablissement.telephone}</div>` : ''}
    </div>

    <div class="titre">Reçu de Paiement</div>
    <div class="numero">N° ${paiement.numeroRecu}</div>

    <table>
      <tr><td class="label">Date</td><td class="valeur">${formatDate(paiement.datePaiement)}</td></tr>
      <tr><td class="label">Élève</td><td class="valeur">${eleve.nom} ${eleve.prenom}</td></tr>
      <tr><td class="label">Matricule</td><td class="valeur">${eleve.matricule}</td></tr>
      <tr><td class="label">Classe</td><td class="valeur">${classe ? classe.nom : '-'}</td></tr>
      <tr><td class="label">Nature du versement</td><td class="valeur">${LIBELLES_TYPE_FRAIS[paiement.typeFrais] || paiement.typeFrais}</td></tr>
      <tr><td class="label">Moyen de paiement</td><td class="valeur">${paiement.moyenPaiement || '-'}</td></tr>
    </table>

    <div class="montant-box">
      <div>Montant versé</div>
      <div class="montant">${formatMontant(paiement.montant)}</div>
    </div>

    <div class="signatures">
      <div class="bloc">Le Payeur</div>
      <div class="bloc">L'Économe</div>
    </div>
  </body>
  </html>
  `;
}

module.exports = { genererHtmlRecu };