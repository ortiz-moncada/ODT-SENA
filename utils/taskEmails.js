// utils/tuArchivoDeCorreos.js
import dotenv from "dotenv";
import { stateMap } from "./stateMap.js";
import { transporter } from "../config/email.js"; // 

dotenv.config();


export const enviarCorreoCreacionTarea = async (task) => {
  if (!task?.workers?.length) return;

  for (const worker of task.workers) {
    if (!worker.gmail) continue;

    try {
      // ✅ Usamos el transporter que ya tiene el puerto 587 o 2525
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: worker.gmail,
        subject: `Nueva tarea asignada: ${task.name}`,
        html: `
          <h3>Hola ${worker.names}</h3>
          <p>Se te ha asignado una nueva tarea.</p>
          <p><b>Tarea:</b> ${task.name}</p>
          <p><b>Fecha de entrega:</b> ${new Date(task.delivery_date).toLocaleDateString()}</p>
          <p><b>Área:</b> ${task.area_id?.name || "No especificada"}</p>
        `,
      });
    } catch (error) {
      console.error(`❌ Error en creación a ${worker.gmail}:`, error.message);
    }
  }
};

export const enviarCorreoCambioEstadoTarea = async (task, estadoAnterior) => {
  if (!task?.workers?.length) return;

  const estadoAntes = Number(estadoAnterior);
  const estadoNuevo = Number(task.stateTask);

  for (const worker of task.workers) {
    if (!worker.gmail) continue;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: worker.gmail,
        subject: `Actualización de tarea: ${task.name}`,
        html: `
          <h3>Hola ${worker.names}</h3>
          <p>El estado de una tarea asignada fue actualizado.</p>
          <p><b>Tarea:</b> ${task.name}</p>
          <p><b>Estado anterior:</b> ${stateMap[estadoAntes] || "Desconocido"}</p>
          <p><b>Nuevo estado:</b> ${stateMap[estadoNuevo] || "Desconocido"}</p>
          <p><b>Fecha de entrega:</b> ${new Date(task.delivery_date).toLocaleDateString()}</p>
        `,
      });
    } catch (error) {
      console.error(`❌ Error en cambio de estado a ${worker.gmail}:`, error.message);
    }
  }
};