import { authenticate } from '../middleware/auth.js';
import { analyzeIssue } from '../services/ai.js';
import { getObject } from '../services/storage.js';

export default async function aiRoutes(app) {
  app.post('/analyze-issue', { preHandler: authenticate }, async (req) => {
    const { title = '', description = '', photo_paths = [] } = req.body || {};

    const images = [];
    for (const path of (photo_paths || []).slice(0, 4)) {
      try {
        const { data } = await getObject(path);
        images.push(Buffer.from(data).toString('base64'));
      } catch (e) {
        console.warn('[ai] photo fetch failed:', e.message);
      }
    }

    return analyzeIssue(title, description, images);
  });
}
