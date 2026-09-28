/**
 * Génère une appréciation automatique selon la moyenne /20.
 * Règles adaptées au système malgache (notes sur 20).
 */
function genererAppreciation(moyenne, rang = null, effectif = null) {
  if (moyenne === null || moyenne === undefined) {
    return 'Résultats insuffisants pour établir une appréciation.';
  }

  let base = '';

  if (moyenne >= 16) {
    base = 'Excellent travail. Élève sérieux, motivé et très performant.';
  } else if (moyenne >= 14) {
    base = 'Très bon travail. Résultats satisfaisants et attitude positive.';
  } else if (moyenne >= 12) {
    base = 'Bon travail. Des efforts réguliers sont à souligner.';
  } else if (moyenne >= 10) {
    base = 'Travail acceptable. Des progrès sont encore possibles avec plus d\'assiduité.';
  } else if (moyenne >= 8) {
    base = 'Résultats insuffisants. Un travail plus régulier et approfondi est nécessaire.';
  } else {
    base = 'Résultats très insuffisants. Un accompagnement renforcé et un effort soutenu s\'imposent.';
  }

  if (rang && effectif && rang === 1) {
    base += ' Félicitations pour la première place de la classe.';
  } else if (rang && effectif && rang <= 3) {
    base += ` Rang ${rang}/${effectif} — résultat honorable.`;
  }

  return base;
}

module.exports = { genererAppreciation };