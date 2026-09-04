/**
 * Échappe les caractères spéciaux HTML pour éviter toute injection
 * lors de l'insertion de données utilisateur (noms, adresses...) dans
 * un template HTML (bulletins, reçus PDF).
 */
function echapperHtml(valeur) {
  if (valeur === null || valeur === undefined) return '';
  return String(valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { echapperHtml };