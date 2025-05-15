import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export const subirAaws = async (file: Express.Multer.File) => {
    const nombreFinal = `${uuidv4()}-${file.originalname}`;
    const comando = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: `documentos/${nombreFinal}`,
        Body: file.buffer,
        ContentType: file.mimetype,

    });

    await s3.send(comando);
    return `documentos/${nombreFinal}`; // ✅ solo la key

};
