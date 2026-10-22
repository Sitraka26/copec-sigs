const prisma = require('../config/prisma');
const { obtenirClasseIdsEnseignant } = require('../utils/enseignant.utils');

async function lister(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);

    const classes = await prisma.classe.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        ...(anneeScolaireId ? { anneeScolaireId } : {}),
        ...(classeIdsEnseignant !== null
          ? { id: { in: classeIdsEnseignant } }
          : {}),
      },
      include: {
        niveau: true,
        anneeScolaire: true,
        enseignantPrincipal: {
          include: { utilisateur: true },
        },
        _count: {
          select: { inscriptions: true },
        },
      },
      orderBy: [
        { niveau: { ordre: 'asc' } },
        { nom: 'asc' },
      ],
    });

    res.json(classes);
  } catch (err) {
    next(err);
  }
}

async function obtenirParId(req, res, next) {
  try {
    const classe = await prisma.classe.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
      },
      include: {
        niveau: true,
        anneeScolaire: true,
        enseignantPrincipal: {
          include: { utilisateur: true },
        },
        inscriptions: {
          include: { eleve: true },
        },
      },
    });

    if (!classe) {
      return res.status(404).json({
        error: 'Classe introuvable',
      });
    }

    const classeIdsEnseignant =
      await obtenirClasseIdsEnseignant(req);

    if (
      classeIdsEnseignant !== null &&
      !classeIdsEnseignant.includes(classe.id)
    ) {
      return res.status(403).json({
        error: "Vous n'enseignez pas dans cette classe",
      });
    }

    res.json(classe);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const {
      nom,
      niveauId,
      anneeScolaireId,
      enseignantPrincipalId,
    } = req.body;

    if (!nom || !niveauId || !anneeScolaireId) {
      return res.status(400).json({
        error:
          'Champs obligatoires manquants (nom, niveauId, anneeScolaireId)',
      });
    }

    const nomClean = nom.trim();

    const doublon = await prisma.classe.findFirst({
      where: {
        etablissementId: req.user.etablissementId,
        anneeScolaireId,
        nom: nomClean,
      },
    });

    if (doublon) {
      return res.status(409).json({
        error: `Une classe « ${nomClean} » existe déjà pour cette année scolaire`,
      });
    }

    const niveau = await prisma.niveau.findUnique({
      where: { id: niveauId },
    });

    if (!niveau) {
      return res.status(404).json({
        error: 'Niveau introuvable',
      });
    }

    let principalId = enseignantPrincipalId || null;

    if (principalId) {
      // Validation de l'enseignant
      const ens = await prisma.enseignant.findFirst({
        where: {
          id: principalId,
          utilisateur: {
            etablissementId: req.user.etablissementId,
          },
        },
      });

      if (!ens) {
        return res.status(404).json({
          error: 'Enseignant introuvable',
        });
      }

      // Vérification de compatibilité avec le cycle
      if (
        ens.cyclePrincipal &&
        ens.cyclePrincipal !== niveau.cycle
      ) {
        return res.status(400).json({
          error: `Cet enseignant est du cycle ${ens.cyclePrincipal}, pas ${niveau.cycle}`,
        });
      }

      // Vérification : un enseignant ne peut être titulaire
      // que d'une seule classe pour la même année scolaire
      const dejaTitulaire = await prisma.classe.findFirst({
        where: {
          etablissementId: req.user.etablissementId,
          anneeScolaireId,
          enseignantPrincipalId: principalId,
        },
      });

      if (dejaTitulaire) {
        return res.status(409).json({
          error: `Cet enseignant est déjà titulaire de la classe « ${dejaTitulaire.nom} ». Un enseignant ne peut être titulaire que d'une seule classe.`,
        });
      }
    }

    const classe = await prisma.classe.create({
      data: {
        etablissementId: req.user.etablissementId,
        nom: nomClean,
        niveauId,
        anneeScolaireId,
        enseignantPrincipalId: principalId,
      },
      include: {
        niveau: true,
        enseignantPrincipal: {
          include: { utilisateur: true },
        },
      },
    });

    res.status(201).json(classe);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error:
          'Une classe avec ce nom existe déjà pour cette année scolaire',
      });
    }

    next(err);
  }
}

async function modifier(req, res, next) {
  try {
    const existante = await prisma.classe.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
      },
    });

    if (!existante) {
      return res.status(404).json({
        error: 'Classe introuvable',
      });
    }

    const {
      nom,
      niveauId,
      enseignantPrincipalId,
    } = req.body;

    const nomClean = nom ? nom.trim() : existante.nom;
    const niveauFinal = niveauId || existante.niveauId;

    // Vérification du doublon de nom
    if (nomClean !== existante.nom) {
      const doublon = await prisma.classe.findFirst({
        where: {
          etablissementId: req.user.etablissementId,
          anneeScolaireId: existante.anneeScolaireId,
          nom: nomClean,
          NOT: {
            id: existante.id,
          },
        },
      });

      if (doublon) {
        return res.status(409).json({
          error: `Une classe « ${nomClean} » existe déjà pour cette année`,
        });
      }
    }

    const niveau = await prisma.niveau.findUnique({
      where: { id: niveauFinal },
    });

    let principalId =
      enseignantPrincipalId !== undefined
        ? enseignantPrincipalId || null
        : existante.enseignantPrincipalId;

    if (principalId) {
      // Validation de l'enseignant
      const ens = await prisma.enseignant.findFirst({
        where: {
          id: principalId,
          utilisateur: {
            etablissementId: req.user.etablissementId,
          },
        },
      });

      if (!ens) {
        return res.status(404).json({
          error: 'Enseignant introuvable',
        });
      }

      // Vérification de compatibilité avec le cycle
      if (
        niveau &&
        ens.cyclePrincipal &&
        ens.cyclePrincipal !== niveau.cycle
      ) {
        return res.status(400).json({
          error: `Cet enseignant est du cycle ${ens.cyclePrincipal}, pas ${niveau.cycle}`,
        });
      }

      // Vérification : un enseignant ne peut être titulaire
      // que d'une seule classe pour la même année scolaire.
      //
      // En modification, on exclut la classe actuelle.
      const dejaTitulaire = await prisma.classe.findFirst({
        where: {
          etablissementId: req.user.etablissementId,
          anneeScolaireId: existante.anneeScolaireId,
          enseignantPrincipalId: principalId,
          id: {
            not: existante.id,
          },
        },
      });

      if (dejaTitulaire) {
        return res.status(409).json({
          error: `Cet enseignant est déjà titulaire de la classe « ${dejaTitulaire.nom} ». Un enseignant ne peut être titulaire que d'une seule classe.`,
        });
      }
    }

    const classe = await prisma.classe.update({
      where: {
        id: req.params.id,
      },
      data: {
        nom: nomClean,
        niveauId: niveauFinal,
        enseignantPrincipalId: principalId,
      },
      include: {
        niveau: true,
        enseignantPrincipal: {
          include: { utilisateur: true },
        },
      },
    });

    res.json(classe);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const existante = await prisma.classe.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
      },
      include: {
        _count: {
          select: { inscriptions: true },
        },
      },
    });

    if (!existante) {
      return res.status(404).json({
        error: 'Classe introuvable',
      });
    }

    if (existante._count.inscriptions > 0) {
      return res.status(409).json({
        error:
          'Impossible de supprimer : des élèves sont inscrits dans cette classe',
      });
    }

    await prisma.classe.delete({
      where: {
        id: req.params.id,
      },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  lister,
  obtenirParId,
  creer,
  modifier,
  supprimer,
};