import mongoose from "mongoose";
import Task from "../models/tasks.js";
import Notification from "../models/notify.js";
import User from "../models/users.js";
import { driveServices } from "../authDrive.js";
import { enviarCorreoCreacionTarea, enviarCorreoCambioEstadoTarea } from "../utils/taskEmails.js";

// --- HELPERS DE SEGURIDAD ---
const getUserId = (req) => req.user?._id || req.user?.id || req.body.userId || req.body.tribute_id;

// --- CONTROLADORES ---

export const postTasks = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuario no identificado. Inicie sesión nuevamente." });

    let { name, description, tribute_id, stateTask, delivery_date, workers, leader, area_id, isMonthly, monthlyDay } = req.body;

    if (!name || !description || !area_id) {
      return res.status(400).json({ error: "Nombre, descripción y área son obligatorios" });
    }

    // Lógica de fechas
    isMonthly = isMonthly === true || isMonthly === "true";
    if (isMonthly) {
      if (!monthlyDay || monthlyDay < 1 || monthlyDay > 28) return res.status(400).json({ error: "Día mensual inválido (1-28)" });
      delivery_date = undefined;
    } else if (!delivery_date) {
      return res.status(400).json({ error: "Fecha de entrega obligatoria" });
    }

    // Parseo de trabajadores
    if (typeof workers === "string") workers = JSON.parse(workers);
    if (!Array.isArray(workers) || workers.length === 0) return res.status(400).json({ error: "Debe asignar al menos un trabajador" });

    if (workers.length > 1 && !leader) {
      return res.status(400).json({ error: "Tareas grupales requieren un líder" });
    } else if (workers.length === 1) {
      leader = workers[0];
    }

    const attached_files = [];
    if (req.files && req.files.file) {
      try {
        const apprenticeData = { firstName: "Tarea", lastName: name.replace(/\s+/g, "_"), documentNumber: Date.now().toString() };
        const uploadResult = await driveServices.uploadFileToDrive(req.files, "tareas_adjuntas", apprenticeData, null, process.env.ID_FOLDER_DRIVE);
        if (uploadResult?.response) {
          uploadResult.response.forEach((file) => {
            attached_files.push({ filename: file.name, url: `https://drive.google.com/file/d/${file.id}/view`, drive_id: file.id, uploaded_at: new Date() });
          });
        }
      } catch (err) { console.error("❌ Drive Error:", err.message); }
    }

    const newTask = new Task({
      name, description, tribute_id: tribute_id || userId,
      stateTask: stateTask || 1, delivery_date, workers, leader, area_id, attached_files, isMonthly, monthlyDay
    });

    await newTask.save();

    // POPULATE COMPLETO (Incluye phone para WhatsApp)
    const taskPopulated = await Task.findById(newTask._id)
      .populate("workers", "names gmail phone")
      .populate("leader", "names gmail phone")
      .populate("area_id", "name")
      .populate("tribute_id", "names gmail phone");

    await notificarCreacionTarea(taskPopulated, userId);

    // Disparo asíncrono de Email y WA
    setImmediate(() => {
      enviarCorreoCreacionTarea(taskPopulated).catch(err => console.error("📧 Email/WA Error:", err.message));
    });

    res.status(201).json({ message: "Tarea creada", task: taskPopulated });
  } catch (error) {
    console.error("❌ postTasks Error:", error);
    res.status(500).json({ error: "Error interno al crear tarea" });
  }
};

export const putTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID inválido" });
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    // 1. Obtener estado anterior
    const taskBefore = await Task.findById(id);
    if (!taskBefore) return res.status(404).json({ error: "Tarea no encontrada" });

    // 2. Actualizar y Popular (Incluye phone)
    const taskUpdated = await Task.findByIdAndUpdate(id, req.body, { new: true })
      .populate("workers", "names gmail phone")
      .populate("tribute_id", "names gmail phone")
      .populate("area_id", "name");

    // 3. Notificar solo si el estado cambió realmente
    if (req.body.stateTask && Number(req.body.stateTask) !== Number(taskBefore.stateTask)) {
      await crearNotificacionCambioEstado(taskUpdated, taskBefore.stateTask, req.body.stateTask, userId);
      
      setImmediate(() => {
        enviarCorreoCambioEstadoTarea(taskUpdated, taskBefore.stateTask)
          .catch(err => console.error("📧 Email/WA Error en PutTasks:", err.message));
      });
    }

    res.json(taskUpdated);
  } catch (error) {
    console.error("❌ putTasks Error:", error);
    res.status(500).json({ error: "Error al actualizar tarea" });
  }
};

export const entregarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) return res.status(401).json({ error: "Debe iniciar sesión para entregar" });

    const taskAntes = await Task.findById(id).populate("leader");
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });

    const leaderId = taskAntes.leader?._id || taskAntes.leader;
    if (String(leaderId) !== String(userId)) {
      return res.status(403).json({ error: "Solo el líder puede entregar" });
    }

    if (!req.files || !req.files.file) return res.status(400).json({ error: "Adjunte el archivo de entrega" });

    const uploadResult = await driveServices.uploadFileToDrive(
      req.files, "tareas_entregadas",
      { firstName: "Entrega", lastName: taskAntes.name.replace(/\s+/g, "_"), documentNumber: Date.now().toString() },
      null, process.env.ID_FOLDER_DRIVE
    );

    if (!uploadResult?.response?.[0]) throw new Error("Fallo subida a Drive");

    const file = uploadResult.response[0];
    const nuevoAdjunto = {
      filename: file.name, url: `https://drive.google.com/file/d/${file.id}/view`,
      drive_id: file.id, uploaded_at: new Date()
    };

    // Actualizar a estado 2 (Entregada/Revisión) y popular phone
    const updatedTask = await Task.findByIdAndUpdate(id, {
      $set: { stateTask: 2, deliveredAt: new Date(), deliveredFile: nuevoAdjunto.url },
      $push: { attached_files: nuevoAdjunto }
    }, { new: true })
      .populate("workers", "names gmail phone")
      .populate("tribute_id", "names gmail phone")
      .populate("area_id", "name");

    await notificarEntregaTarea(updatedTask, userId);
    
    setImmediate(() => {
        enviarCorreoCambioEstadoTarea(updatedTask, taskAntes.stateTask)
            .catch(err => console.error("❌ Error WA en Entrega:", err.message));
    });

    res.json({ message: "Tarea entregada", task: updatedTask });
  } catch (error) {
    console.error("❌ entregarTarea Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- MÉTODOS DE OBTENCIÓN (Todos con phone) ---

export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("workers", "names gmail phone")
      .populate("leader", "names gmail phone")
      .populate("area_id", "name")
      .populate("tribute_id", "names gmail phone");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tareas" });
  }
};

export const getTasksByWorker = async (req, res) => {
  try {
    const { worker } = req.params;
    const tasks = await Task.find({ workers: worker })
      .populate("workers", "names gmail phone")
      .populate("leader", "names gmail phone")
      .populate("area_id", "name");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tareas" });
  }
};

export const getMonthlyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ isMonthly: true })
      .populate("workers", "names gmail phone");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tareas mensuales" });
  }
};

// --- FUNCIONES DE NOTIFICACIÓN INTERNAS ---

const crearNotificacionCambioEstado = async (tarea, estadoAnterior, nuevoEstado, usuarioQueCambio) => {
  try {
    const idsANotificar = new Set([
      ...tarea.workers.map(w => (w._id || w).toString()),
      (tarea.tribute_id?._id || tarea.tribute_id).toString()
    ]);

    for (const uId of idsANotificar) {
      await Notification.create({
        title: uId === usuarioQueCambio.toString() ? "Has cambiado el estado" : "Cambio de estado en tarea",
        nameTask: tarea.name,
        description: `Estado: ${estadoAnterior} -> ${nuevoEstado}`,
        task_id: tarea._id,
        user_id: uId,
        area_id: tarea.area_id?._id || tarea.area_id,
        deliveryDate: tarea.delivery_date
      });
    }
  } catch (err) { console.error("Error notificación estado:", err.message); }
};

const notificarCreacionTarea = async (tarea, creadorId) => {
  try {
    const ids = new Set([...tarea.workers.map(w => (w._id || w).toString()), creadorId.toString()]);
    for (const uId of ids) {
      await Notification.create({
        title: uId === creadorId.toString() ? "Has creado una tarea" : "Te asignaron una tarea",
        nameTask: tarea.name,
        description: "Nueva tarea registrada",
        task_id: tarea._id,
        user_id: uId,
        area_id: tarea.area_id?._id || tarea.area_id,
        deliveryDate: tarea.delivery_date
      });
    }
  } catch (err) { console.error("Error notificación creación:", err.message); }
};

const notificarEntregaTarea = async (tarea, usuarioQueEntrego) => {
  try {
    const ids = new Set([
      ...tarea.workers.map(w => (w._id || w).toString()),
      (tarea.tribute_id?._id || tarea.tribute_id).toString()
    ]);
    for (const uId of ids) {
      await Notification.create({
        title: uId === usuarioQueEntrego.toString() ? "Has entregado la tarea" : "Tarea entregada para revisión",
        nameTask: tarea.name,
        description: "Estado: En Revisión",
        task_id: tarea._id,
        user_id: uId,
        area_id: tarea.area_id?._id || tarea.area_id,
        deliveryDate: tarea.delivery_date
      });
    }
  } catch (err) { console.error("Error notificación entrega:", err.message); }
};