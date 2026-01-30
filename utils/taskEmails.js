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
      await transporter.sendMail({
  from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
  to: worker.gmail,
  subject: ` Nueva tarea asignada: ${task.name}`,
  attachments: [
    {
      filename: "logo.png",
      path: "./image/logo-sena-blanco.png", 
      cid: "logoSena",
    },
  ],
  html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
        
        <div style="background: #39A900; padding: 20px; text-align: center;">
          <img src="cid:logoSena" alt="SENA ODT" style="max-width: 80px;" />
        </div>

        <div style="padding: 25px; color: #333; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #39A900;">¡Hola ${worker.names}!</h2>
          <p style="font-size: 15px;">
            Se te ha asignado una <b>nueva tarea</b> en la plataforma. Aquí tienes los detalles:
          </p>

          <div style="background: #f8f9fa; border-left: 5px solid #39A900; padding: 15px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 5px 0;"><b> Tarea:</b> ${task.name}</p>
            <p style="margin: 5px 0;"><b> Fecha de entrega:</b> ${new Date(task.delivery_date).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><b> Área:</b> ${task.area_id?.name || "No especificada"}</p>
          </div>

          <p style="font-size: 14px;">
            Por favor, ingresa a la plataforma para revisar los detalles y comenzar con tus actividades.
          </p>

          <div style="text-align: center; margin-top: 25px;">
            <p style="margin-bottom: 0;">Saludos,</p>
            <b style="color: #39A900;">Organizador de Tareas - SENA</b>
          </div>
        </div>

        <div style="background: #f1f1f1; text-align: center; padding: 15px; font-size: 12px; color: #777;">
          © ${new Date().getFullYear()} SENA · Centro de formación
          <br>
          Este es un mensaje automático, por favor no respondas a este correo.
        </div>

      </div>
    </div>
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
  from: `"SENA ODT" <${process.env.EMAIL_USER}>`,
  to: worker.gmail,
  subject: `📌 Actualización de tarea: ${task.name}`,
  attachments: [
    {
      filename: "logo.png",
      path: "./image/logo-sena-blanco.png",
      cid: "logoSena", 
    },
  ],
  html: `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f4f6f9;
      padding: 30px;
    ">
      <div style="
        max-width: 600px;
        margin: auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      ">
        
        <!-- HEADER -->
        <div style="
          background: #39A900;
          padding: 20px;
          text-align: center;
        ">
          <img 
            src="cid:logoSena"
            alt="SENA ODT"
            style="max-width: 220px;"
          />
        </div>

        <!-- BODY -->
        <div style="padding: 25px; color: #333;">
          <h2 style="margin-top: 0; color: #39A900;">
            Hola ${worker.names} 
          </h2>

          <p style="font-size: 15px;">
            Te informamos que el estado de una tarea asignada ha sido actualizado.
          </p>

          <div style="
            background: #f8f9fa;
            border-left: 5px solid #39A900;
            padding: 15px;
            margin: 20px 0;
            border-radius: 6px;
          ">
            <p><b> Tarea:</b> ${task.name}</p>
            <p><b> Estado anterior:</b> ${stateMap[estadoAntes] || "Desconocido"}</p>
            <p><b> Nuevo estado:</b> ${stateMap[estadoNuevo] || "Desconocido"}</p>
            <p><b> Fecha de entrega:</b> ${new Date(task.delivery_date).toLocaleDateString()}</p>
          </div>

          <p style="font-size: 14px;">
            Si tienes dudas o necesitas realizar alguna acción adicional, por favor comunícate con tu líder o revisa la plataforma.
          </p>

          <p style="margin-top: 30px;">
            Saludos,<br>
            <b>Organizador de Tareas - SENA</b>
          </p>
        </div>

        <!-- FOOTER -->
        <div style="
          background: #f1f1f1;
          text-align: center;
          padding: 12px;
          font-size: 12px;
          color: #777;
        ">
          © ${new Date().getFullYear()} SENA · Organizador de Tareas  
          <br>
          Este es un mensaje automático, por favor no responder.
        </div>

      </div>
    </div>
  `,
});

    } catch (error) {
      console.error(`❌ Error en cambio de estado a ${worker.gmail}:`, error.message);
    }
  }
};