import mongoose from "mongoose";
import Task from "../models/tasks.js";
import Notification from "../models/notify.js";
import User from "../models/users.js";
import { driveServices } from "../authDrive.js";
import { enviarCorreoCreacionTarea, enviarCorreoCambioEstadoTarea } from "../utils/taskEmails.js";

// --- FUNCIÓN PARA NOTIFICAR CAMBIO DE ESTADO ---
const crearNotificacionCambioEstado = async (tarea, estadoAnterior, nuevoEstado, usuarioQueCambio) => {
  try {
    const trabajadores = tarea.workers || [];
    const creadorId = (tarea.tribute_id?._id || tarea.tribute_id || '').toString();
    
    console.log(`📢 Creando notificaciones de cambio de estado`);
    console.log(`   Usuario que cambió: ${usuarioQueCambio}`);
    console.log(`   Creador de la tarea: ${creadorId}`);
    console.log(`   Trabajadores: ${trabajadores.length}`);
    
    const usuariosNotificados = new Set();
    
    // 1. Notificar al que hizo el cambio (siempre recibe "Has cambiado")
    try {
      await Notification.create({
        title: "Has cambiado el estado de la tarea",
        nameTask: tarea.name,
        description: `El estado cambió de ${estadoAnterior} a ${nuevoEstado}`,
        task_id: tarea._id,
        user_id: usuarioQueCambio,
        area_id: tarea.area_id._id || tarea.area_id,
        deliveryDate: tarea.delivery_date
      });
      
      usuariosNotificados.add(usuarioQueCambio.toString());
      console.log(`   ✅ "Has cambiado" → Usuario ${usuarioQueCambio}`);
    } catch (error) {
      console.error(`   ❌ Error al notificar a quien hizo el cambio:`, error.message);
    }
    
    // 2. Notificar a todos los trabajadores (excepto quien hizo el cambio)
    for (const trabajador of trabajadores) {
      const trabajadorId = (trabajador._id || trabajador).toString();
      
      if (usuariosNotificados.has(trabajadorId)) {
        console.log(`   ⏭️  Saltando ${trabajadorId} (ya notificado)`);
        continue;
      }
      
      try {
        await Notification.create({
          title: "Han cambiado el estado de la tarea",
          nameTask: tarea.name,
          description: `El estado cambió de ${estadoAnterior} a ${nuevoEstado}`,
          task_id: tarea._id,
          user_id: trabajadorId,
          area_id: tarea.area_id._id || tarea.area_id,
          deliveryDate: tarea.delivery_date
        });
        
        usuariosNotificados.add(trabajadorId);
        console.log(`   ✅ "Han cambiado" → Trabajador ${trabajadorId}`);
      } catch (error) {
        console.error(`   ❌ Error al notificar a trabajador ${trabajadorId}:`, error.message);
      }
    }
    
    // 3. Notificar al creador si no es trabajador ni quien hizo el cambio
    if (creadorId && 
        !usuariosNotificados.has(creadorId) && 
        mongoose.Types.ObjectId.isValid(creadorId)) {
      try {
        await Notification.create({
          title: "Han cambiado el estado de la tarea",
          nameTask: tarea.name,
          description: `El estado cambió de ${estadoAnterior} a ${nuevoEstado}`,
          task_id: tarea._id,
          user_id: creadorId,
          area_id: tarea.area_id._id || tarea.area_id,
          deliveryDate: tarea.delivery_date
        });
        
        console.log(`   ✅ "Han cambiado" → Creador ${creadorId}`);
      } catch (error) {
        console.error(`   ❌ Error al notificar al creador:`, error.message);
      }
    }
    
    console.log(`   📊 Total notificados: ${usuariosNotificados.size + (creadorId && !usuariosNotificados.has(creadorId) ? 1 : 0)}`);
    
  } catch (error) {
    console.error("❌ Error al crear notificaciones:", error);
  }
};

// --- FUNCIÓN PARA NOTIFICAR CREACIÓN DE TAREA ---
const notificarCreacionTarea = async (tarea, creadorId) => {
  try {
    const trabajadores = tarea.workers || [];
    
    console.log(`📢 Notificando creación de tarea`);
    console.log(`   Creador: ${creadorId}`);
    console.log(`   Trabajadores: ${trabajadores.length}`);
    
    const usuariosNotificados = new Set();
    
    // 1. Notificar al creador (siempre recibe "Has creado")
    try {
      await Notification.create({
        title: "Has creado una nueva tarea",
        nameTask: tarea.name,
        description: `Tarea creada en estado: 1`,
        task_id: tarea._id,
        user_id: creadorId,
        area_id: tarea.area_id._id || tarea.area_id,
        deliveryDate: tarea.delivery_date
      });
      
      usuariosNotificados.add(creadorId.toString());
      console.log(`   ✅ "Has creado" → Creador ${creadorId}`);
    } catch (error) {
      console.error(`   ❌ Error al notificar al creador:`, error.message);
    }
    
    // 2. Notificar a todos los trabajadores (excepto si son el creador)
    for (const trabajador of trabajadores) {
      const trabajadorId = (trabajador._id || trabajador).toString();
      
      if (usuariosNotificados.has(trabajadorId)) {
        console.log(`   ⏭️  Saltando ${trabajadorId} (es el creador)`);
        continue;
      }
      
      try {
        await Notification.create({
          title: "Te han asignado una nueva tarea",
          nameTask: tarea.name,
          description: `Tarea creada en estado: 1`,
          task_id: tarea._id,
          user_id: trabajadorId,
          area_id: tarea.area_id._id || tarea.area_id,
          deliveryDate: tarea.delivery_date
        });
        
        console.log(`   ✅ "Te han asignado" → Trabajador ${trabajadorId}`);
      } catch (error) {
        console.error(`   ❌ Error al notificar a trabajador ${trabajadorId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Error al notificar creación:", error);
  }
};

// --- FUNCIÓN PARA NOTIFICAR ENTREGA DE TAREA ---
const notificarEntregaTarea = async (tarea, usuarioQueEntrego) => {
  try {
    const trabajadores = tarea.workers || [];
    const creadorId = (tarea.tribute_id?._id || tarea.tribute_id || '').toString();
    
    console.log(`📢 Notificando entrega de tarea`);
    console.log(`   Usuario que entregó: ${usuarioQueEntrego}`);
    
    const usuariosNotificados = new Set();
    
    // 1. Notificar al que entregó (siempre recibe "Has entregado")
    try {
      await Notification.create({
        title: "Has entregado la tarea",
        nameTask: tarea.name,
        description: `La tarea pasó a estado: 2 (En Revisión)`,
        task_id: tarea._id,
        user_id: usuarioQueEntrego,
        area_id: tarea.area_id._id || tarea.area_id,
        deliveryDate: tarea.delivery_date
      });
      
      usuariosNotificados.add(usuarioQueEntrego.toString());
      console.log(`   ✅ "Has entregado" → Usuario ${usuarioQueEntrego}`);
    } catch (error) {
      console.error(`   ❌ Error al notificar a quien entregó:`, error.message);
    }
    
    // 2. Notificar a otros trabajadores
    for (const trabajador of trabajadores) {
      const trabajadorId = (trabajador._id || trabajador).toString();
      
      if (usuariosNotificados.has(trabajadorId)) continue;
      
      try {
        await Notification.create({
          title: "Han cambiado el estado de la tarea",
          nameTask: tarea.name,
          description: `La tarea pasó a estado: 2 (En Revisión)`,
          task_id: tarea._id,
          user_id: trabajadorId,
          area_id: tarea.area_id._id || tarea.area_id,
          deliveryDate: tarea.delivery_date
        });
        
        usuariosNotificados.add(trabajadorId);
        console.log(`   ✅ "Han cambiado" → Trabajador ${trabajadorId}`);
      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
      }
    }
    
    // 3. Notificar al creador/admin si no fue notificado
    if (creadorId && 
        !usuariosNotificados.has(creadorId) && 
        mongoose.Types.ObjectId.isValid(creadorId)) {
      try {
        await Notification.create({
          title: "Han cambiado el estado de la tarea",
          nameTask: tarea.name,
          description: `La tarea pasó a estado: 2 (En Revisión)`,
          task_id: tarea._id,
          user_id: creadorId,
          area_id: tarea.area_id._id || tarea.area_id,
          deliveryDate: tarea.delivery_date
        });
        
        console.log(`   ✅ "Han cambiado" → Creador/Admin ${creadorId}`);
      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Error al notificar entrega:", error);
  }
};

// --- OBTENER TAREAS MENSUALES ---
export const getMonthlyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ isMonthly: true })
      .populate("workers", "names gmail")
      .populate("leader", "names gmail");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tareas mensuales" });
  }
};

// --- CREAR TAREA ---
export const postTasks = async (req, res) => {
  try {
    console.log("📥 POST /tasks/create");
    
    let { name, description, tribute_id, stateTask, delivery_date, workers, leader, area_id, isMonthly, monthlyDay } = req.body;

    if (!name || !description) return res.status(400).json({ error: "Nombre y descripción obligatorios" });
    if (!area_id || !mongoose.Types.ObjectId.isValid(area_id)) return res.status(400).json({ error: "Área inválida" });

    isMonthly = isMonthly === true || isMonthly === "true";

    if (isMonthly) {
      if (!monthlyDay || monthlyDay < 1 || monthlyDay > 28) {
        return res.status(400).json({ error: "Día mensual inválido (1-28)" });
      }
      delivery_date = undefined;
    } else if (!delivery_date) {
      return res.status(400).json({ error: "Fecha de entrega obligatoria para tareas no mensuales" });
    }

    if (typeof workers === "string") workers = JSON.parse(workers);
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un trabajador" });
    }

    if (workers.length > 1) {
      if (!leader) return res.status(400).json({ error: "Tareas grupales requieren un líder" });
    } else {
      leader = workers[0];
    }

    const attached_files = [];
    if (req.files && req.files.file) {
      try {
        const apprenticeData = {
          firstName: "Tarea",
          lastName: name.replace(/\s+/g, "_"),
          documentNumber: Date.now().toString()
        };

        const uploadResult = await driveServices.uploadFileToDrive(
          req.files,
          "tareas_adjuntas",
          apprenticeData,
          null,
          process.env.ID_FOLDER_DRIVE
        );

        if (uploadResult.response && uploadResult.response.length > 0) {
          for (const file of uploadResult.response) {
            attached_files.push({
              filename: file.name,
              url: `https://drive.google.com/file/d/${file.id}/view`,
              drive_id: file.id,
              uploaded_at: new Date()
            });
          }
        }
      } catch (error) {
        console.error("Error al subir archivos iniciales:", error);
      }
    }

    const creadorId = tribute_id || req.user.id;

    const newTask = new Task({
      name, description, 
      tribute_id: creadorId,
      stateTask: stateTask || 1,
      delivery_date, workers, leader, area_id,
      attached_files, isMonthly, monthlyDay
    });

    await newTask.save();
    
    const taskPopulated = await Task.findById(newTask._id)
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name");

    // ✅ Notificar creación de tarea
    await notificarCreacionTarea(taskPopulated, creadorId);

    setImmediate(() => enviarCorreoCreacionTarea(taskPopulated).catch(console.error));

    res.status(201).json({ message: "Tarea creada", task: taskPopulated });
  } catch (error) {
    console.error("Error en postTasks:", error);
    res.status(500).json({ error: "Error al crear tarea", details: error.message });
  }
};

// --- ACTUALIZAR TAREA ---
export const putTasks = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "No autorizado", details: "Sesión inválida" });
    }
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de tarea inválido" });

    const taskAntes = await Task.findById(id)
      .populate("leader")
      .populate("area_id")
      .populate("tribute_id");
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });

    const estadoAnterior = taskAntes.stateTask;
    let updateData = { ...req.body };

    if (updateData.workers && typeof updateData.workers === "string") {
      updateData.workers = JSON.parse(updateData.workers);
    }

    if (req.files && req.files.file) {
      const leaderId = taskAntes.leader?._id || taskAntes.leader;
      if (String(leaderId) !== String(userId)) {
        return res.status(403).json({ error: "Solo el líder puede adjuntar archivos" });
      }

      try {
        const apprenticeData = {
          firstName: "Tarea",
          lastName: taskAntes.name.replace(/\s+/g, "_"),
          documentNumber: Date.now().toString()
        };

        const uploadResult = await driveServices.uploadFileToDrive(
          req.files,
          "tareas_adjuntas",
          apprenticeData,
          null,
          process.env.ID_FOLDER_DRIVE
        );

        if (uploadResult.response && uploadResult.response.length > 0) {
          const newFiles = uploadResult.response.map(file => ({
            filename: file.name,
            url: `https://drive.google.com/file/d/${file.id}/view`,
            drive_id: file.id,
            uploaded_at: new Date()
          }));

          updateData.$push = { attached_files: { $each: newFiles } };
          delete updateData.attached_files;
        }
      } catch (error) {
        console.error("Error al subir archivos en actualización:", error);
        return res.status(500).json({ 
          error: "Error al subir archivos", 
          details: error.message 
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name")
      .populate("tribute_id");

    // ✅ Notificar cambio de estado
    if (updateData.stateTask && Number(updateData.stateTask) !== Number(estadoAnterior)) {
      await crearNotificacionCambioEstado(
        updatedTask, 
        estadoAnterior, 
        updateData.stateTask,
        userId
      );
      
      setImmediate(() => enviarCorreoCambioEstadoTarea(updatedTask, estadoAnterior).catch(console.error));
    }

    res.json({ message: "Tarea actualizada", task: updatedTask });
  } catch (error) {
    console.error("Error putTasks:", error.message);
    res.status(500).json({ error: "Error al actualizar tarea", details: error.message });
  }
};

// --- ENTREGAR TAREA (POR EL TRABAJADOR) ---
export const entregarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: "No autorizado" });

    const taskAntes = await Task.findById(id)
      .populate("area_id")
      .populate("tribute_id");
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });

    if (String(taskAntes.leader) !== String(req.user.id)) {
      return res.status(403).json({ error: "Solo el líder asignado puede entregar" });
    }

    let deliveredFileUrl = null;
    let driveFileId = null;
    
    if (req.files && req.files.file) {
      try {
        const apprenticeData = {
          firstName: "Entrega",
          lastName: taskAntes.name.replace(/\s+/g, "_"),
          documentNumber: Date.now().toString()
        };

        const uploadResult = await driveServices.uploadFileToDrive(
          req.files,
          "tareas_entregadas",
          apprenticeData,
          null,
          process.env.ID_FOLDER_DRIVE
        );

        if (uploadResult.response && uploadResult.response.length > 0) {
          const file = uploadResult.response[0];
          deliveredFileUrl = `https://drive.google.com/file/d/${file.id}/view`;
          driveFileId = file.id;
        }
      } catch (error) {
        console.error("Error al subir archivo de entrega:", error);
        return res.status(500).json({ 
          error: "Error al subir archivo de entrega", 
          details: error.message 
        });
      }
    }
    
    const task = await Task.findByIdAndUpdate(id, {
      stateTask: 2,
      deliveredAt: new Date(),
      deliveredFile: deliveredFileUrl,
      driveStatus: deliveredFileUrl ? "OK" : "FAILED"
    }, { new: true })
      .populate("workers leader")
      .populate("area_id")
      .populate("tribute_id");

    // ✅ Notificar entrega de tarea
    await notificarEntregaTarea(task, req.user.id);

    setImmediate(() => enviarCorreoCambioEstadoTarea(task, taskAntes.stateTask).catch(console.error));

    res.json({ message: "Tarea enviada a revisión", task });
  } catch (error) {
    console.error("Error en entregarTarea:", error);
    res.status(500).json({ error: "Error al entregar tarea", details: error.message });
  }
};

// --- OTROS MÉTODOS ---
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("workers leader area_id");
    res.json(tasks);
  } catch (error) {
    console.error("Error en getTasks:", error);
    res.status(500).json({ error: "Error al obtener tareas" });
  }
};

export const getTasksByWorker = async (req, res) => {
  try {
    const { worker } = req.params;
    if (!mongoose.Types.ObjectId.isValid(worker)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    const tasks = await Task.find({ workers: worker }).populate("workers leader area_id");
    res.json(tasks);
  } catch (error) {
    console.error("Error en getTasksByWorker:", error);
    res.status(500).json({ error: "Error al obtener tareas del trabajador" });
  }
};