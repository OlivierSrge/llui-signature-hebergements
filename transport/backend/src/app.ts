import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import tripsRouter     from './routes/trips.js';
import vehiclesRouter  from './routes/vehicles.js';
import documentsRouter from './routes/documents.js';
import syncRouter      from './routes/sync.js';
import checkinsRouter  from './routes/checkins.js';

const app = express();

// =============================================================================
// Sécurité de base
// =============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '5mb' })); // Pour les batches GPS et données OCR
app.use(express.urlencoded({ extended: false })); // Pour les webhooks Twilio

// =============================================================================
// Rate limiting
// =============================================================================

// Limite globale : 200 req/min par IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
}));

// Limite stricte sur l'authentification : 10 req/min
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion.' },
});

// =============================================================================
// Documentation OpenAPI
// =============================================================================

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'L&Lui Logistique — API Transport',
      version: '1.0.0',
      description:
        'API de gestion de transport lourd transfrontalier — Corridor CEMAC\n\n' +
        'Couvre : Douala/Kribi → N\'Djamena, Bangui, Brazzaville',
      contact: { name: 'L&Lui Logistique', email: 'api@llui-logistique.cm' },
    },
    servers: [
      { url: process.env.API_URL ?? 'http://localhost:4000', description: 'Serveur courant' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        EstimateCostRequest: {
          type: 'object',
          required: ['originCountryId', 'destinationCountryId', 'corridorId', 'cargoWeightTons', 'cargoValueXaf', 'vehicleCategory'],
          properties: {
            originCountryId:       { type: 'string', format: 'uuid' },
            destinationCountryId:  { type: 'string', format: 'uuid' },
            corridorId:            { type: 'string', format: 'uuid' },
            cargoWeightTons:       { type: 'number', minimum: 0.1 },
            cargoValueXaf:         { type: 'integer', minimum: 0 },
            vehicleCategory:       { type: 'string', enum: ['light', 'medium', 'heavy', 'extra_heavy'] },
            tripId:                { type: 'string', format: 'uuid', description: 'Si fourni, persist l\'estimation' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'L&Lui API Docs',
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// =============================================================================
// Routes
// =============================================================================

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/trips',      tripsRouter);
app.use('/api/vehicles',   vehiclesRouter);
app.use('/api/documents',  documentsRouter);
app.use('/api/sync',       syncRouter);
app.use('/api/checkins',   checkinsRouter);

// =============================================================================
// Gestion des erreurs
// =============================================================================

// Route inconnue
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Erreur globale
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);

  // Erreurs PostgreSQL connues
  if ((err as any).code === '23505') {
    return res.status(409).json({ error: 'Doublon : cette ressource existe déjà' });
  }
  if ((err as any).code === '23503') {
    return res.status(400).json({ error: 'Référence invalide : entité liée introuvable' });
  }
  if ((err as any).code === '22P02') {
    return res.status(400).json({ error: 'UUID invalide' });
  }

  const status = (err as any).status ?? 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Erreur interne du serveur'
      : err.message;

  return res.status(status).json({ error: message });
});

export default app;
