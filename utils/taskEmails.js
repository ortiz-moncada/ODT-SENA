import dotenv from "dotenv";
import { stateMap } from "./stateMap.js";
import { transporter } from "../config/email.js";

dotenv.config();

// --- FUNCIÓN AUXILIAR PARA WHATSAPP ---
const enviarWhatsApp = async (numero, mensaje) => {
    // Lee la URL de Render configurada en el panel de Environment
    const BOT_URL = process.env.BOT_URL || 'http://localhost:4001';
    
    console.log(`--- Intentando enviar WA a: ${numero} a través de ${BOT_URL} ---`); 

    try {
        let numeroLimpio = String(numero).replace(/\D/g, '');
        if (numeroLimpio.length === 10 && !numeroLimpio.startsWith('57')) {
            numeroLimpio = '57' + numeroLimpio;
        }

        const response = await fetch(`${BOT_URL}/v1/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: numeroLimpio,
                message: mensaje
            })
        });

        // Verificamos si la respuesta es correcta antes de parsear
        if (!response.ok) throw new Error(`Error en el servidor del Bot: ${response.status}`);

        const data = await response.json();
        console.log(`🚀 Respuesta del Bot en Render:`, data);
    } catch (error) {
        console.error(`❌ Error real en el fetch de WhatsApp:`, error.message);
    }
};

const prepararAdjuntos = (taskFiles) => {
  const adjuntosBase = [
    {
      filename: "logo.png",
      path: "./image/logo-sena-blanco.png",
      cid: "logoSena",
    },
  ];

  if (taskFiles && taskFiles.length > 0) {
    taskFiles.forEach((file) => {
      let directPath = file.url;
      if (file.url.includes('drive.google.com')) {
        const fileId = file.url.split('/d/')[1]?.split('/')[0];
        if (fileId) {
          directPath = `https://docs.google.com/uc?export=download&id=${fileId}`;
        }
      }

      adjuntosBase.push({
        filename: file.filename || "archivo_adjunto.pdf",
        path: directPath,
        contentType: 'application/pdf' 
      });
    });
  }
  return adjuntosBase;
};

// --- NOTIFICACIÓN DE CREACIÓN ---
export const enviarCorreoCreacionTarea = async (task) => {
  if (!task?.workers?.length) return;

  const destinatarios = [...task.workers];
  if (task.tribute_id && task.tribute_id.gmail) {
    destinatarios.push(task.tribute_id);
  }

  for (const person of destinatarios) {
    // 1. INTENTO DE CORREO (Independiente)
    if (person.gmail) {
      transporter.sendMail({
        from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
        to: person.gmail,
        subject: `Nueva tarea: ${task.name}`,
        attachments: prepararAdjuntos(task.attached_files),
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
              <div style="background: #39A900; padding: 20px; text-align: center;">
                <img src="cid:logoSena" alt="SENA ODT" style="max-width: 80px;" />
              </div>
              <div style="padding: 25px; color: #333; line-height: 1.6;">
                <h2 style="margin-top: 0; color: #39A900;">¡Hola ${person.names}!</h2>
                <p>Se ha registrado una <b>nueva tarea</b>.</p>
                <div style="background: #f8f9fa; border-left: 5px solid #39A900; padding: 15px; margin: 20px 0;">
                  <p><b>Tarea:</b> ${task.name}</p>
                  <p><b>Entrega:</b> ${new Date(task.delivery_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        `,
      }).catch(err => console.error(`📧 Error Correo (ignorado para no bloquear WA):`, err.message));
    }

    // 2. INTENTO DE WHATSAPP (Independiente)
    if (person.phone) {
      const mensajeWA = `🆕 *NUEVA TAREA ASIGNADA*\n\n` +
                        `Hola *${person.names}*,\nSe ha registrado una tarea:\n\n` +
                        `📝 *Tarea:* ${task.name}\n` +
                        `📅 *Entrega:* ${new Date(task.delivery_date).toLocaleDateString()}\n\n` +
                        `_Revisa tu correo para ver los detalles._`;
      
      // No usamos 'await' aquí para que un timeout del bot no trabe el bucle
      enviarWhatsApp(person.phone, mensajeWA).catch(err => console.error(`❌ Error WA:`, err.message));
    }
  }
};

// --- NOTIFICACIÓN DE CAMBIO DE ESTADO ---
export const enviarCorreoCambioEstadoTarea = async (task, estadoAnterior) => {
  if (!task?.workers?.length) return;

  const estadoAntes = Number(estadoAnterior);
  const estadoNuevo = Number(task.stateTask);

  const destinatarios = [...task.workers];
  if (task.tribute_id && task.tribute_id.gmail) {
    const yaEstaEnLista = destinatarios.some(w => w.gmail === task.tribute_id.gmail);
    if (!yaEstaEnLista) destinatarios.push(task.tribute_id);
  }

  for (const person of destinatarios) {
    // 1. CORREO
    if (person.gmail) {
      transporter.sendMail({
        from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
        to: person.gmail,
        subject: `Actualización de tarea: ${task.name}`,
        attachments: prepararAdjuntos(task.attached_files),
        html: `
          <div style="padding: 25px; color: #333;">
            <h2 style="color: #39A900;">Hola ${person.names}</h2>
            <p>El estado de la tarea <b>${task.name}</b> ha cambiado.</p>
            <p><b>Antes:</b> ${stateMap[estadoAntes] || "Desconocido"}</p>
            <p><b>Ahora:</b> ${stateMap[estadoNuevo] || "Desconocido"}</p>
          </div>
        `,
      }).catch(err => console.error(`📧 Error Correo Cambio Estado:`, err.message));
    }

    // 2. WHATSAPP
    if (person.phone) {
      const mensajeWA = `*ACTUALIZACIÓN DE TAREA*\n\n` +
                        `Hola *${person.names}*,\n*${task.name}* cambió de estado:\n\n` +
                        `*Antes:* ${stateMap[estadoAntes] || "Desconocido"}\n` +
                        `*Ahora:* ${stateMap[estadoNuevo] || "Desconocido"}`;
      
      enviarWhatsApp(person.phone, mensajeWA).catch(err => console.error(`❌ Error WA Cambio Estado:`, err.message));
    }
  }
};