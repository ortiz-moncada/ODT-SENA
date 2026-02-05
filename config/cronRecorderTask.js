import cron from "node-cron";
import Task from "../models/tasks.js";
import { transporter } from "../config/email.js"; 
import dotenv from "dotenv";

dotenv.config();
/**
 * Función para enviar el mensaje a través de la API del Bot
 * Ajustada para agregar el código de país automáticamente
 */
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
            console.log(` WhatsApp enviado con éxito a: ${numeroLimpio}`);
        } else {
            console.error(` Error en el servidor del bot: ${response.statusText}`);
        }
    } catch (error) {
        console.error(` No se pudo conectar con el bot de WhatsApp:`, error.message);
    }
};

const mensajesRecordatorio = [
" La fecha de entrega se acerca, no olvides completar tu tarea.",
" No olvides que tienes una tarea pendiente.",
" Recuerda revisar tu tarea, la entrega está próxima.",
" Tu tarea sigue pendiente, ¡aún estás a tiempo!",
" Recordatorio: una tarea está por vencer.",
" No dejes pasar el día sin avanzar en tu tarea.",
" El tiempo corre, revisa tu tarea asignada.",
" Tienes una tarea activa esperando tu atención.",
" Falta poco para la entrega de tu tarea.",
" Aún no has finalizado una tarea asignada.",
" Hay una tarea pendiente que requiere acción.",
" Tu tarea continúa en estado pendiente.",
" Es un buen momento para avanzar en tu tarea.",
" Revisa tu lista: hay una tarea sin completar.",
" Una tarea sigue abierta en tu panel."

];

function obtenerMensajeAleatorio() {
  return mensajesRecordatorio[Math.floor(Math.random() * mensajesRecordatorio.length)];
}

cron.schedule("0 8 * * *", async () => {
  console.log("🚀 Iniciando envío masivo de recordatorios (Email + WhatsApp)");

  try {
    const hoy = new Date();

    const tareas = await Task.find({
      stateTask: 1,
      delivery_date: { $gte: hoy }
    }).populate("workers", "names gmail phone"); 

    for (const tarea of tareas) {
      for (const trabajador of tarea.workers) {

        const delayBase = 8000; 
        const delayRandom = Math.floor(Math.random() * (12000 - 3000) + 3000);
        const totalDelay = delayBase + delayRandom;

        console.log(` Esperando ${totalDelay / 1000}s para notificar a ${trabajador.names}`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));

        const frase = obtenerMensajeAleatorio();

        // --- 1. ENVÍO POR EMAIL ---
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: trabajador.gmail,
          subject: `Recordatorio de tarea: ${tarea.name}`,
          html: `
            <h2>${frase}</h2>
            <p><b>${trabajador.names}</b>, recuerda que tienes una tarea pendiente.</p>
            <p><b>Tarea:</b> ${tarea.name}</p>
            <p><b>Fecha de entrega:</b> ${new Date(tarea.delivery_date).toLocaleDateString()}</p>
          `
        });
        console.log(` Correo enviado a: ${trabajador.gmail}`);

        // --- 2. ENVÍO POR WHATSAPP ---
        if (trabajador.phone) {
            const mensajeWS = `*RECORDATORIO DE TAREA*\n\n` +
                              `Hola *${trabajador.names}*,\n${frase}\n\n` +
                              `*Tarea:* ${tarea.name}\n` +
                              `*Entrega:* ${new Date(tarea.delivery_date).toLocaleDateString()}`;
            
            await enviarNotificacionWhatsApp(trabajador.phone, mensajeWS);
        }
      }
    }
  } catch (error) {
    console.error("Error general en el Cron:", error);
  }
});