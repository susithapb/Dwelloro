import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import FileRef from "../models/FileRef.js";
import { authenticate } from "../middleware/auth.js";
import { putObject, getObject } from "../services/storage.js";
import { strip } from "../utils/helpers.js";
import env from "../config/env.js";

export default async function uploadRoutes(app) {
  app.post("/api/uploads", { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ detail: "No file" });

      const buf = await data.toBuffer();
      const ext = (data.filename?.split(".").pop() || "bin").toLowerCase();
      const ct = data.mimetype || "application/octet-stream";
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
      console.log(err);
      return reply.code(500).send({ detail: "Upload error" });
    }
  });

  app.get("/api/files/*", async (req, reply) => {
    try {
      const path = req.url.replace(/^\/api\/files\//, '').split('?')[0];
      const token =
        req.headers.authorization?.replace(/^Bearer /, "") || req.query.auth;

      if (!token) return reply.code(401).send({ detail: "Missing auth" });
      try {
        jwt.verify(token, env.JWT_SECRET);
      } catch {
        return reply.code(401).send({ detail: "Invalid token" });
      }

      const record = await FileRef.findOne({
        storage_path: path,
        is_deleted: false,
      });
      if (!record) return reply.code(404).send({ detail: "File not found" });

      const { data, contentType } = await getObject(path);
      reply
        .header("Content-Type", record.content_type || contentType)
        .send(Buffer.from(data));
    } catch (err) {
      console.log(err);
      return reply
        .code(500)
        .send({ detail: "Error occured while fetching image(s)" });
    }
  });
}
