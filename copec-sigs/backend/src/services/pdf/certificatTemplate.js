const { echapperHtml } = require('../../utils/html.utils');

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * data : { etablissement, eleve, classe, anneeScolaire, type }
 * type : 'SCOLARITE' | 'ASSIDUITE' | 'REUSSITE'
 */
function genererHtmlCertificat(data) {
  const { etablissement, eleve, classe, anneeScolaire, type = 'SCOLARITE' } = data;

  const titres = {
    SCOLARITE: 'CERTIFICAT DE SCOLARITÉ',
    ASSIDUITE: 'CERTIFICAT D\'ASSIDUITÉ',
    REUSSITE: 'CERTIFICAT DE RÉUSSITE',
  };

  const corps = {
    SCOLARITE: `Le Directeur de <strong>${echapperHtml(etablissement.nom)}</strong> certifie que l'élève <strong>${echapperHtml(eleve.prenom)} ${echapperHtml(eleve.nom)}</strong>, matricule <strong>${echapperHtml(eleve.matricule)}</strong>, est régulièrement inscrit(e) en classe de <strong>${echapperHtml(classe?.nom || '—')}</strong> pour l'année scolaire <strong>${echapperHtml(anneeScolaire?.libelle || '—')}</strong>.`,
    ASSIDUITE: `Le Directeur de <strong>${echapperHtml(etablissement.nom)}</strong> certifie que l'élève <strong>${echapperHtml(eleve.prenom)} ${echapperHtml(eleve.nom)}</strong>, matricule <strong>${echapperHtml(eleve.matricule)}</strong>, a fait preuve d'assiduité durant l'année scolaire <strong>${echapperHtml(anneeScolaire?.libelle || '—')}</strong>.`,
    REUSSITE: `Le Directeur de <strong>${echapperHtml(etablissement.nom)}</strong> certifie que l'élève <strong>${echapperHtml(eleve.prenom)} ${echapperHtml(eleve.nom)}</strong>, matricule <strong>${echapperHtml(eleve.matricule)}</strong>, a satisfait aux exigences de l'année scolaire <strong>${echapperHtml(anneeScolaire?.libelle || '—')}</strong>.`,
  };

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: A4; margin: 25mm; }
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; color: #111; line-height: 1.6; }
      .entete { text-align: center; margin-bottom: 30px; }
      .entete .nom { font-size: 18px; font-weight: bold; text-transform: uppercase; }
      .entete .info { font-size: 12px; color: #444; margin-top: 4px; }
      .titre { text-align: center; font-size: 20px; font-weight: bold; margin: 40px 0 30px; text-decoration: underline; letter-spacing: 1px; }
      .corps { text-align: justify; margin: 0 10px 40px; font-size: 15px; }
      .footer { margin-top: 60px; display: flex; justify-content: space-between; }
      .signature { text-align: center; width: 45%; }
      .signature .label { margin-bottom: 50px; font-size: 13px; }
      .date { text-align: right; margin-top: 20px; font-size: 13px; }
    </style>
  </head>
  <body>
        <div class="entete">
      <img src="http://localhost:4000/static/logo-copec.png" alt="Logo COPEC" style="max-height: 70px; margin-bottom: 8px;" />
      <div class="nom">${echapperHtml(etablissement.nom)}</div>
      ${etablissement.adresse ? `<div class="info">${echapperHtml(etablissement.adresse)}</div>` : ''}
      ${etablissement.telephone ? `<div class="info">Tél. : ${echapperHtml(etablissement.telephone)}</div>` : ''}
    </div>

    <div class="titre">${titres[type] || titres.SCOLARITE}</div>

    <div class="corps">
      ${corps[type] || corps.SCOLARITE}
      <br/><br/>
      En foi de quoi le présent certificat est délivré pour servir et valoir ce que de droit.
    </div>

    <div class="date">Fait à ${echapperHtml(etablissement.adresse ? etablissement.adresse.split(',')[0] : '………………')}, le ${formatDate(new Date())}</div>

    <div class="footer">
      <div class="signature">
        <div class="label">L'intéressé(e)</div>
      </div>
      <div class="signature">
        <div class="label">Le Directeur</div>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = { genererHtmlCertificat };