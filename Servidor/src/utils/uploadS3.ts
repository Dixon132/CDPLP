import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const RAW_URL = process.env.SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
const BUCKET = 'documentos';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

/**
 * Sube un archivo a Supabase Storage.
 * @param file   Archivo de Multer (en memoria)
 * @param folder Carpeta destino: 'correspondencia' | 'colegiados' | 'postulaciones' | 'comprobantes'
 * @returns      Ruta relativa guardada: "folder/uuid-nombre.ext"
 */
export async function subirArchivo(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const nombreLimpio = file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .substring(0, 40);
    const rutaRelativa = `${folder}/${uuidv4()}-${nombreLimpio}.${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(rutaRelativa, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) throw new Error(`Supabase upload error: ${error.message}`);
    return rutaRelativa;
}

/**
 * Elimina un archivo de Supabase Storage.
 * @param rutaRelativa Ruta relativa: "folder/uuid-nombre.ext"
 */
export async function eliminarArchivo(rutaRelativa: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([rutaRelativa]);
    if (error) console.error(`Supabase delete error: ${error.message}`);
}

/**
 * Elimina múltiples archivos de Supabase Storage.
 * @param rutas Array de rutas relativas
 */
export async function eliminarArchivos(rutas: string[]): Promise<void> {
    if (!rutas.length) return;
    const { error } = await supabase.storage.from(BUCKET).remove(rutas);
    if (error) console.error(`Supabase batch delete error: ${error.message}`);
}

/**
 * Mueve un archivo de una ruta a otra dentro del mismo bucket.
 * @param rutaOrigen Ruta actual (ej: "postulaciones/uuid.pdf")
 * @param rutaDestino Nueva ruta (ej: "colegiados/uuid.pdf")
 */
export async function moverArchivo(rutaOrigen: string, rutaDestino: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).move(rutaOrigen, rutaDestino);
    if (error) throw new Error(`Supabase move error: ${error.message}`);
}

/**
 * Construye la URL pública completa a partir de la ruta relativa guardada en BD.
 * @param rutaRelativa "carpeta/uuid-nombre.ext"
 * @returns URL pública completa
 */
export function buildPublicUrl(rutaRelativa: string | null | undefined): string | null {
    if (!rutaRelativa) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${rutaRelativa}`;
}

// Compat aliases para no romper código existente
export const subirAaws = (file: Express.Multer.File) => subirArchivo(file, 'colegiados');
export const subirAawsCorrespondencia = (file: Express.Multer.File) => subirArchivo(file, 'correspondencia');