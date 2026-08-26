const NOMS_PERIODES = {
  1: '1er Bimestre',
  2: '2ème Bimestre',
  3: '3ème Bimestre',
  4: '4ème Bimestre',
  5: '5ème Bimestre',
};

function formatNombre(n) {
  if (n === null || n === undefined) return '-';
  return Number(n).toFixed(2);
}

/**
 * data attendu :
 * {
 *   etablissement: { nom },
 *   eleve: { matricule, nom, prenom },
 *   classe: { nom, niveau: { libelle, filiere } },
 *   anneeScolaire: { libelle },
 *   matieres: [{ id, nom, coefficient }],
 *   notesParMatierePeriode: { [matiereId]: { [periode]: valeur } },
 *   bulletinsParPeriode: { [periode]: { moyenneGenerale, rang } },
 *   moyenneAnnuelle, rangAnnuel, effectifClasse
 * }
 */
function genererHtmlBulletin(data) {
  const {
    etablissement,
    eleve,
    classe,
    anneeScolaire,
    matieres,
    notesParMatierePeriode,
    bulletinsParPeriode,
    moyenneAnnuelle,
    rangAnnuel,
    effectifClasse,
  } = data;

  const periodes = [1, 2, 3, 4, 5];

  const lignesMatieres = matieres
    .map((matiere) => {
      const cellulesPeriodes = periodes
        .map((p) => {
          const valeur = notesParMatierePeriode[matiere.id]?.[p];
          return `
            <td class="coef">${matiere.coefficient}</td>
            <td class="note">${valeur !== undefined && valeur !== null ? formatNombre(valeur) : '-'}</td>
          `;
        })
        .join('');
      return `<tr><td class="discipline">${matiere.nom}</td>${cellulesPeriodes}</tr>`;
    })
    .join('');

  const ligneMoyennes = periodes
    .map((p) => {
      const b = bulletinsParPeriode[p];
      return `<td colspan="2" class="moyenne-cell">${b ? formatNombre(b.moyenneGenerale) : '-'}</td>`;
    })
    .join('');

  const ligneRangs = periodes
    .map((p) => {
      const b = bulletinsParPeriode[p];
      return `<td colspan="2" class="rang-cell">${b && b.rang ? `${b.rang}${effectifClasse ? ' / ' + effectifClasse : ''}` : '-'}</td>`;
    })
    .join('');

  const enTetesPeriodes = periodes
    .map((p) => `<th colspan="2">${NOMS_PERIODES[p]}</th>`)
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
      .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
      .entete h1 { font-size: 16px; margin: 0 0 4px 0; text-transform: uppercase; }
      .entete .etablissement { font-weight: bold; font-size: 13px; }
      .infos-eleve { margin-bottom: 10px; font-size: 12px; }
      .infos-eleve span { margin-right: 24px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
      th { background-color: #e8e8e8; font-size: 11px; }
      td.discipline { text-align: left; font-weight: 600; white-space: nowrap; }
      td.coef { width: 28px; color: #555; }
      td.note { font-weight: bold; }
      .moyenne-cell, .rang-cell { font-weight: bold; background-color: #f5f5f5; }
      .ligne-titre td { text-align: left; font-weight: bold; background-color: #f0f0f0; }
      .resultat-annuel { margin-top: 16px; display: flex; justify-content: space-between; }
      .resultat-annuel .bloc { border: 1px solid #333; padding: 8px 14px; }
      .resultat-annuel .bloc strong { display: block; font-size: 13px; margin-bottom: 2px; }
      .resultat-annuel .valeur { font-size: 18px; font-weight: bold; }
      .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
      .signatures .bloc-signature { text-align: center; width: 30%; }
      .signatures .ligne { margin-top: 40px; border-top: 1px solid #333; }
    </style>
  </head>
  <body>
    <div class="entete">
      <div>
        <div class="etablissement">${etablissement.nom}</div>
        <div>Année scolaire : ${anneeScolaire.libelle}</div>
      </div>
      <h1>Bulletin de Notes</h1>
    </div>

    <div class="infos-eleve">
      <span><strong>Nom et Prénom :</strong> ${eleve.nom} ${eleve.prenom}</span>
      <span><strong>Matricule :</strong> ${eleve.matricule}</span>
      <span><strong>Classe :</strong> ${classe.nom} (${classe.niveau.libelle}${classe.niveau.filiere ? ' - ' + classe.niveau.filiere : ''})</span>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">Disciplines</th>
          ${enTetesPeriodes}
        </tr>
        <tr>
          ${periodes.map(() => '<th>Coef</th><th>Note</th>').join('')}
        </tr>
      </thead>
      <tbody>
        ${lignesMatieres}
        <tr class="ligne-titre">
          <td>Moyenne du bimestre</td>
          ${ligneMoyennes}
        </tr>
        <tr class="ligne-titre">
          <td>Rang</td>
          ${ligneRangs}
        </tr>
      </tbody>
    </table>

    <div class="resultat-annuel">
      <div class="bloc">
        <strong>Moyenne Annuelle</strong>
        <span class="valeur">${formatNombre(moyenneAnnuelle)} / 20</span>
      </div>
      <div class="bloc">
        <strong>Rang Annuel</strong>
        <span class="valeur">${rangAnnuel ? `${rangAnnuel}${effectifClasse ? ' / ' + effectifClasse : ''}` : '-'}</span>
      </div>
      <div class="bloc">
        <strong>Décision</strong>
        <span class="valeur">&nbsp;</span>
      </div>
    </div>

    <div class="signatures">
      <div class="bloc-signature"><div class="ligne">Le Titulaire</div></div>
      <div class="bloc-signature"><div class="ligne">Les Parents</div></div>
      <div class="bloc-signature"><div class="ligne">Le Directeur / Proviseur</div></div>
    </div>
  </body>
  </html>
  `;
}

module.exports = { genererHtmlBulletin };