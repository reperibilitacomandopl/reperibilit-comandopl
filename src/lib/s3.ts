import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.S3_REGION || "eu-central-1",
  endpoint: process.env.S3_ENDPOINT, // e.g. per MinIO o Cloudflare R2
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // necessario per MinIO
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "portale-caserma-storage"

export async function generateUploadUrl(key: string, contentType: string, maxSizeMB: number = 10) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  // Per limitare le dimensioni dell'upload, si consiglia di controllare lato server,
  // tuttavia S3 non permette di impostare strict limits sui PUT presigned URL direttamente,
  // altrimenti bisognerebbe usare i POST presigned (createPresignedPost).
  // Per semplicità qui usiamo il PUT, e controlleremo che i form non eccedano.
  
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 ora (OQ1)
  return signedUrl
}

export async function generateDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 ora (OQ1)
  return signedUrl
}

export default s3Client
