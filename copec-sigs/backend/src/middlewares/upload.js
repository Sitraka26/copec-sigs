const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dossier = path.join(__dirname, '../../uploads/eleves');
if (!fs.existsSync(dossier)) {
  fs.mkdirSync(dossier, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dossier),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

function filtreFichier(_req, file, cb) {
  const ok = /jpeg|jpg|png|pdf|webp/i.test(path.extname(file.originalname));
  if (ok) cb(null, true);
  else cb(new Error('Formats acceptés : JPG, PNG, PDF, WEBP'));
}

const uploadEleves = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: filtreFichier,
});

module.exports = { uploadEleves };