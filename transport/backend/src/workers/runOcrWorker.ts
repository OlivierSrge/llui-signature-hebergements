/**
 * Point d'entrée standalone pour le worker OCR.
 * Utilisé par Render : `node dist/workers/runOcrWorker.js`
 */
import 'dotenv/config';
import './ocrWorker.js';

console.log('[OCR Worker] Démarré — en attente de jobs...');

process.on('SIGTERM', async () => {
  console.log('[OCR Worker] Arrêt propre...');
  process.exit(0);
});
