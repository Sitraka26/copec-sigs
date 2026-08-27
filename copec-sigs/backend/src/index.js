require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');


const authRoutes = require('./routes/auth.routes');
const eleveRoutes = require('./routes/eleve.routes');
const classeRoutes = require('./routes/classe.routes');
const niveauRoutes = require('./routes/niveau.routes');
const inscriptionRoutes = require('./routes/inscription.routes');
const noteRoutes = require('./routes/note.routes');
const bulletinRoutes = require('./routes/bulletin.routes');
const matiereRoutes = require('./routes/matiere.routes');
const paiementRoutes = require('./routes/paiement.routes');
const presenceRoutes = require('./routes/presence.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API SIGS COPEC opérationnelle' });
});

app.use('/api/auth', authRoutes);
app.use('/api/eleves', eleveRoutes);
app.use('/api/classes', classeRoutes);
app.use('/api/niveaux', niveauRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/matieres', matiereRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/presences', presenceRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});