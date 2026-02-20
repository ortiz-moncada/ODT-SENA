import cron from "node-cron";
import Task from "../models/tasks.js";
import { transporter } from "./email.js"; // Ajustado a tu estructura de carpetas
import dotenv from "dotenv";

dotenv.config();

const enviarNotificacionWhatsApp = async (numero, mensaje) => {
  try {
    const BOT_URL = process.env.BOT_URL || 'http://localhost:4001';
    let numeroLimpio = String(numero).replace(/\D/g, '');

    if (!numeroLimpio.startsWith('57') && numeroLimpio.length === 10) {
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

    if (response.ok) {
    } else {
      console.error(` ❌ Error en el servidor del bot: ${response.statusText}`);
    }
  } catch (error) {
    console.error(` ⚠️ No se pudo conectar con el bot de WhatsApp:`, error.message);
  }
};

const mensajesRecordatorio = [
  "La fecha de entrega se acerca, no olvides completar tu tarea.",
  "No olvides que tienes una tarea pendiente.",
  "Recuerda revisar tu tarea, la entrega está próxima.",
  "Tu tarea sigue pendiente, ¡aún estás a tiempo!",
  "Recordatorio: una tarea está por vencer.",
  "El tiempo corre, revisa tu tarea asignada.",
  "Hay una tarea pendiente que requiere acción.",
  "Tu tarea continúa en estado pendiente."
];

function obtenerMensajeAleatorio() {
  return mensajesRecordatorio[Math.floor(Math.random() * mensajesRecordatorio.length)];
}

cron.schedule("0 8 * * *", async () => {
  console.log("🚀 Iniciando envío masivo de recordatorios (08:00 AM)");
  await procesarNotificaciones([1], "RECORDATORIO DE TAREA");
});

cron.schedule("0 9 * * *", async () => {
  console.log("🚀 Iniciando reporte de tareas rechazadas (09:00 AM)");
  await procesarNotificaciones([4], "TAREA RECHAZADA / REQUIERE ATENCIÓN");
});

/* *
 * Función reutilizable para procesar y enviar notificaciones
 * @param {Array} estados 
 * @param {String} etiqueta 
 */
async function procesarNotificaciones(estados, etiqueta) {
  try {
    const hoy = new Date();
    const tareas = await Task.find({
      stateTask: { $in: estados }
    }).populate("workers", "names gmail phone");

    for (const tarea of tareas) {
      for (const trabajador of tarea.workers) {

        // Delay aleatorio para evitar bloqueos (Anti-spam)
        const totalDelay = Math.floor(Math.random() * (10000 - 5000) + 5000);
        await new Promise(resolve => setTimeout(resolve, totalDelay));

        const frase = obtenerMensajeAleatorio();
        const esRechazada = tarea.stateTask === 4;

        //  ENVÍO POR EMAIL 
        if (trabajador.gmail) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: trabajador.gmail,
            subject: `${etiqueta}: ${tarea.name}`,
            html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: ${esRechazada ? '#e74c3c' : '#2ecc71'};">${etiqueta}</h2>
                                <p>Hola <b>${trabajador.names}</b>,</p>
                                <p>${esRechazada ? "Tu tarea ha sido rechazada o requiere correcciones urgentes." : frase}</p>
                                <p><b>Tarea:</b> ${tarea.name}</p>
                                <p><b>Fecha de entrega:</b> ${new Date(tarea.delivery_date).toLocaleDateString()}</p>
                                <p style="margin-top: 20px; font-size: 12px; color: #7f8c8d;">SENA ODT - Sistema de Gestión de Tareas</p>
                            </div>
                        `
          });
        }

        // ENVÍO POR WHATSAPP 
        if (trabajador.phone) {
          const icono = esRechazada ? "❌" : "🔔";
          const mensajeWS = `${icono} *${etiqueta}*\n\n` +
            `Hola *${trabajador.names}*,\n` +
            `${esRechazada ? "Tu tarea requiere correcciones." : frase}\n\n` +
            `📝 *Tarea:* ${tarea.name}\n` +
            `📅 *Entrega:* ${new Date(tarea.delivery_date).toLocaleDateString()}`;

          await enviarNotificacionWhatsApp(trabajador.phone, mensajeWS);
        }
      }
    }
  } catch (error) {
    console.error(` ❌ Error procesando ${etiqueta}:`, error);
  }
}