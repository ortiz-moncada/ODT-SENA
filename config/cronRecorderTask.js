import cron from "node-cron";
import Task from "../models/tasks.js";
import users from "../models/users.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mensajesRecordatorio = [
  " La fecha de entrega se acerca, no olvides completar tu tarea.",
  " No olvides que tienes una tarea pendiente.",
  " Recuerda revisar tu tarea, la entrega está próxima.",
  " Tu tarea sigue pendiente, ¡aún estás a tiempo!",
  " Recordatorio: una tarea está por vencer.",
  " No dejes pasar el día sin avanzar en tu tarea.",
  " El tiempo corre, revisa tu tarea asignada.",
];

// Función para obtener frase aleatoria
function obtenerMensajeAleatorio() {
  return mensajesRecordatorio[Math.floor(Math.random() * mensajesRecordatorio.length)];
}


cron.schedule("0 8 * * *", async () => {
  console.log(" Ejecutando recordatorio diario de tareas");

  try {
    const hoy = new Date();

    const tareas = await Task.find({
      stateTask: 1,
      delivery_date: { $gte: hoy }
    }).populate("workers", "names gmail");

    for (const tarea of tareas) {
      for (const trabajador of tarea.workers) {

        const delayBase = 8000; 
        const delayRandom = Math.floor(Math.random() * (12000 - 3000) + 3000);
        const totalDelay = delayBase + delayRandom;

        console.log(`Esperando ${totalDelay / 1000}s antes de enviar correo a ${trabajador.gmail}`);

        await new Promise(resolve => setTimeout(resolve, totalDelay));

        const mensaje = obtenerMensajeAleatorio();

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: trabajador.gmail,
          subject: `Recordatorio de tarea: ${tarea.name}`,
          html: `
            <h2>${mensaje}</h2>
            <p><b>${trabajador.names}</b>, recuerda que tienes una tarea pendiente.</p>
            <p><b>Tarea:</b> ${tarea.name}</p>
            <p><b>Descripción:</b> ${tarea.description}</p>
            <p><b>Fecha de entrega:</b> ${new Date(tarea.delivery_date).toLocaleDateString()}</p>
            <br>
            <p>Por favor revisa el sistema para más detalles.</p>
          `
        });

        console.log(`Correo enviado a: ${trabajador.gmail}`);
      }
    }

  } catch (error) {
    console.error(" Error al enviar recordatorios:", error);
  }

});
