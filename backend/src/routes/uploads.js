import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import FileRef from "../models/FileRef.js";
import Ticket from "../models/Ticket.js";
import Inspection from "../models/Inspection.js";
import Compliance from "../models/Compliance.js";
import Property from "../models/Property.js";
import { authenticate } from "../middleware/auth.js";
import { putObject, getObject } from "../services/storage.js";
import { strip } from "../utils/helpers.js";
import env from "../config/env.js";

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'application/pdf',
]);

const MAGIC = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/gif':  [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

function magicOk(buf, mime) {
  const sig = MAGIC[mime];
  if (!sig) return true;
  return sig.every((b, i) => buf[i] === b);
}

export default async function uploadRoutes(app) {
  app.post("/api/uploads", { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ detail: "No file" });

      const buf = await data.toBuffer();
      const ct = (data.mimetype || "").toLowerCase().split(";")[0].trim();

      if (!ALLOWED_MIME.has(ct)) {
        return reply.code(415).send({ detail: `File type not allowed. Accepted: images and PDF.` });
      }
      if (!magicOk(buf, ct)) {
        return reply.code(415).send({ detail: "File content does not match declared type." });
      }

      const ext = (data.filename?.split(".").pop() || "bin").toLowerCase();
      const path = `${env.APP_NAME}/uploads/${req.user.sub}/${uuid()}.${ext}`;

      const result = await putObject(path, buf, ct);
      const ref = await FileRef.create({
        storage_path: result.path,
        original_filename: data.filename,
        content_type: ct,
        size: result.size || buf.length,
        owner_id: req.user.sub,
      });

      return {
        id: ref.id,
        storage_path: ref.storage_path,
        url: `/api/files/${ref.storage_path}`,
        content_type: ct,
        size: ref.size,
      };
    } catch (err) {
      console.error('[uploads] upload failed:', err.message);
      return reply.code(500).send({ detail: "Upload error" });
    }
  });

  app.get("/api/files/*", async (req, reply) => {
    try {
      const path = req.url.replace(/^\/api\/files\//, '').split('?')[0];
      const token =
        req.headers.authorization?.replace(/^Bearer /, "") || req.query.auth;

      if (!token) return reply.code(401).send({ detail: "Missing auth" });
      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET);
      } catch {
        return reply.code(401).send({ detail: "Invalid token" });
      }

      const record = await FileRef.findOne({ storage_path: path, is_deleted: false });
      if (!record) return reply.code(404).send({ detail: "File not found" });

      // Caller must own the file OR be authorized via an entity that references it
      if (record.owner_id !== decoded.sub) {
        const { role, sub } = decoded;
        const [ticket, inspection, compliance] = await Promise.all([
          Ticket.findOne({ photo_paths: path }, { property_id: 1, reporter_id: 1, assigned_contractor_id: 1 }),
          Inspection.findOne({ 'rooms.photo_paths': path }, { property_id: 1, inspector_id: 1 }),
          Compliance.findOne({ evidence_paths: path }, { property_id: 1 }),
        ]);
        const propertyId = ticket?.property_id ?? inspection?.property_id ?? compliance?.property_id;
        if (!propertyId) return reply.code(403).send({ detail: "Forbidden" });
        const property = await Property.findOne({ id: propertyId });
        let canAccess = false;
        if (role === 'property_manager') canAccess = property?.manager_id === sub;
        else if (role === 'landlord') canAccess = property?.landlord_id === sub;
        else if (role === 'tenant') canAccess = property?.tenant_id === sub;
        else if (role === 'contractor') canAccess = ticket?.assigned_contractor_id === sub;
        else if (role === 'inspector') {
          canAccess = inspection?.inspector_id === sub ||
            !!(await Inspection.exists({ property_id: propertyId, inspector_id: sub }));
        }
        if (!canAccess) return reply.code(403).send({ detail: "Forbidden" });
      }

      const { data, contentType } = await getObject(path);
      reply
        .header("Content-Type", record.content_type || contentType)
        .send(Buffer.from(data));
    } catch (err) {
      console.error('[uploads] file fetch failed:', err.message);
      return reply.code(500).send({ detail: "Error fetching file" });
    }
  });
}
