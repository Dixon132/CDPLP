import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM ?? 'CDPLP <noreply@tudominio.com>';

export async function enviarCorreoAceptacion(opts: {
    correo: string;
    nombre: string;
    apellido: string;
    pin: string;
}) {
    const { correo, nombre, apellido, pin } = opts;
    await resend.emails.send({
        from: FROM,
        to: correo,
        subject: '¡Tu postulación fue aceptada! — CDPLP',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
          <h2 style="color:#1e3a5f;margin-bottom:8px;">Bienvenido al CDPLP</h2>
          <p style="color:#374151;">Estimado/a <strong>${nombre} ${apellido}</strong>,</p>
          <p style="color:#374151;">Nos complace informarte que tu postulación como colegiado ha sido <strong style="color:#16a34a;">aceptada</strong>.</p>
          <p style="color:#374151;">Tu <strong>PIN de acceso</strong> al sistema es:</p>
          <div style="background:#1e3a5f;color:#fff;font-size:28px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;border-radius:8px;margin:16px 0;">${pin}</div>
          <p style="color:#6b7280;font-size:13px;">Guarda este PIN en un lugar seguro. Lo necesitarás para acceder al sistema de actividades sociales e institucionales.</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
          <p style="color:#9ca3af;font-size:12px;text-align:center;">Colegio Departamental de Profesionales de La Paz</p>
        </div>`,
    });
}

export async function enviarCorreoRechazo(opts: {
    correo: string;
    nombre: string;
    apellido: string;
    motivo?: string;
}) {
    const { correo, nombre, apellido, motivo } = opts;
    await resend.emails.send({
        from: FROM,
        to: correo,
        subject: 'Resultado de tu postulación — CDPLP',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
          <h2 style="color:#1e3a5f;margin-bottom:8px;">Resultado de postulación</h2>
          <p style="color:#374151;">Estimado/a <strong>${nombre} ${apellido}</strong>,</p>
          <p style="color:#374151;">Lamentamos informarte que tu postulación como colegiado no pudo ser aprobada en esta ocasión.</p>
          ${motivo ? `<p style="color:#374151;"><strong>Motivo:</strong> ${motivo}</p>` : ''}
          <p style="color:#374151;">Puedes volver a postular una vez que hayas subsanado los documentos o requisitos indicados.</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
          <p style="color:#9ca3af;font-size:12px;text-align:center;">Colegio Departamental de Profesionales de La Paz</p>
        </div>`,
    });
}
