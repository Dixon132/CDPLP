import multer from "multer";

// Solo en memoria para enviar a S3 (no guarda en disco)
const storage = multer.memoryStorage();

export const upload = multer({ storage });
