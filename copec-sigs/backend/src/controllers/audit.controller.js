const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { etablissementId: req.user.etablissementId },
        include: {
          utilisateur: {
            select: { nom: true, prenom: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip,
      }),
      prisma.auditLog.count({
        where: { etablissementId: req.user.etablissementId },
      }),
    ]);

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      logs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister };