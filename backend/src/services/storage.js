import env from "../config/env.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

let storageKey = null;

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function putObject(path, buf, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: path,
      Body: buf,
      ContentType: contentType,
    });

    await s3.send(command);

    return {
      path,
      size: buf.length,
    };
  } catch (err) {
    console.log(err)
    return reply.code(500).send({ detail: "Storage error" });
  }
}

export async function getObject(path) {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: path,
  });

  const response = await s3.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return {
    data: Buffer.concat(chunks),
    contentType: response.ContentType || "application/octet-stream",
  };
}
