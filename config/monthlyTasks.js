// utils/taskScheduler.js
import cron from "node-cron";
import Task from "../models/tasks.js";
import { enviarCorreoCreacionTarea } from "../utils/taskEmails.js";

/**
 * Inicia el scheduler de tareas mensuales
 * Se ejecuta todos los días a las 00:00
 */
export const iniciarSchedulerTareasMensuales = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const today = new Date();
      const day = today.getDate();

      console.log(`⏰ [CRON] Verificación tareas mensuales - Día ${day}`);

      // Buscar tareas mensuales base que correspondan al día de hoy
      const monthlyTasks = await Task.find({
        isMonthly: true,
        monthlyDay: day,
        parentTask: null, // solo tareas base (no hijas)
      })
        .populate("workers", "names gmail")
        .populate("leader", "names gmail")
        .populate("area_id", "name");

      if (!monthlyTasks.length) {
        console.log("✅ No hay tareas mensuales programadas para hoy");
        return;
      }

      console.log(`📋 Encontradas ${monthlyTasks.length} tareas mensuales para procesar`);

      for (const task of monthlyTasks) {
        try {
          // 🔒 Evitar duplicados del mismo mes
          const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

          const existe = await Task.findOne({
            parentTask: task._id,
            createdAt: { $gte: startMonth, $lte: endMonth },
          });

          if (existe) {
            console.log(`⚠️ Ya existe tarea del mes actual para: "${task.name}"`);
            continue;
          }

          // ✅ Calcular fecha de entrega (30 días desde hoy por defecto)
          const deliveryDate = new Date(today);
          deliveryDate.setDate(deliveryDate.getDate() + 30); // Puedes ajustar esto

          // Crear tarea hija
          const nuevaTarea = await Task.create({
            name: `${task.name} - ${today.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`,
            description: task.description,
            workers: task.workers.map(w => w._id || w),
            leader: task.leader._id || task.leader,
            area_id: task.area_id._id || task.area_id,
            tribute_id: task.tribute_id,
            delivery_date: deliveryDate, // ✅ FECHA FUTURA, no hoy
            stateTask: 1,
            parentTask: task._id,
            isMonthly: false, // Las hijas NO son mensuales
            attached_files: task.attached_files || [], // Copiar archivos adjuntos
          });

          // Populate para el correo
          const tareaPopulada = await Task.findById(nuevaTarea._id)
            .populate("workers", "names gmail")
            .populate("leader", "names gmail")
            .populate("area_id", "name");

          // 📧 Enviar correo de notificación (asíncrono)
          setImmediate(async () => {
            try {
              await enviarCorreoCreacionTarea(tareaPopulada);
              console.log(`📧 Correo enviado para: "${nuevaTarea.name}"`);
            } catch (emailError) {
              console.error(`⚠️ Error enviando correo para "${nuevaTarea.name}":`, emailError.message);
            }
          });

          console.log(`✅ Tarea mensual creada: "${nuevaTarea.name}" (Vence: ${deliveryDate.toLocaleDateString()})`);

        } catch (taskError) {
          console.error(`❌ Error procesando tarea "${task.name}":`, taskError.message);
          // Continuar con las demás tareas aunque una falle
          continue;
        }
      }

      console.log("🎉 Proceso de tareas mensuales completado");

    } catch (error) {
      console.error("❌ Error crítico en scheduler de tareas mensuales:", error);
    }
  });

  console.log("✅ Scheduler de tareas mensuales iniciado (ejecuta diariamente a las 00:00)");
};