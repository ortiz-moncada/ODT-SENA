import mongoose from "mongoose";
import Task from "../models/tasks.js";
import { uploadToDrive } from "../utils/googleDrive.js";
import { enviarCorreoCreacionTarea, enviarCorreoCambioEstadoTarea } from "../utils/taskEmails.js";

const getMonthlyTasks = async (req, res) => {
  const tasks = await Task.find({ isMonthly: true }).populate("workers", "names gmail").populate("leader", "names gmail");
  res.json(tasks);
};

const postTasks = async (req, res) => {
       console.log('📥 req.body recibido:', req.body);
    console.log('🔍 isMonthly (raw):', req.body.isMonthly, 'tipo:', typeof req.body.isMonthly);
  try {

    let { name, description, tribute_id, stateTask, delivery_date, workers, leader, area_id, isMonthly, monthlyDay } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: "Nombre y descripción son obligatorios" });
    }

    if (!area_id || !mongoose.Types.ObjectId.isValid(area_id)) {
      return res.status(400).json({ error: "Área inválida" });
    }

    isMonthly = isMonthly === true || isMonthly === "true";

    if (isMonthly) {
      if (!monthlyDay || monthlyDay < 1 || monthlyDay > 28) {
        return res.status(400).json({ error: "Debe indicar un día válido del mes (1–28)" });
      }
      delivery_date = undefined;
    } else {
      if (!delivery_date || delivery_date === "undefined" || delivery_date === "null") {
        return res.status(400).json({ error: "La fecha de entrega es obligatoria para tareas no mensuales" });
      }
    }

    let tributeValue = null;
    if (tribute_id && tribute_id !== "null" && tribute_id !== "undefined" && tribute_id !== "0") {
      if (!mongoose.Types.ObjectId.isValid(tribute_id)) {
        return res.status(400).json({ error: "tribute_id inválido" });
      }
      tributeValue = tribute_id;
    }

    if (typeof workers === "string") {
      workers = JSON.parse(workers);
    }

    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Debe haber al menos un worker" });
    }

    const invalidWorkers = workers.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidWorkers.length) {
      return res.status(400).json({ error: "Workers inválidos", invalidWorkers });
    }

    if (workers.length > 1) {
      if (!leader || !mongoose.Types.ObjectId.isValid(leader)) {
        return res.status(400).json({ error: "Líder inválido" });
      }
      if (!workers.includes(leader)) {
        return res.status(400).json({ error: "El líder debe pertenecer a los workers" });
      }
    } else {
      leader = workers[0];
    }

    const attached_files = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const driveFile = await uploadToDrive(file);
        if (!driveFile) continue;
        attached_files.push({ filename: file.originalname, url: driveFile.webViewLink, drive_id: driveFile.id, uploaded_at: new Date() });
      }
    }

    const newTask = new Task({ name, description, tribute_id: tributeValue, stateTask: stateTask || 1, ...(delivery_date ? { delivery_date } : {}), workers, leader, area_id, attached_files, isMonthly, ...(isMonthly ? { monthlyDay } : {}) });
    await newTask.save();

    const taskPopulated = await Task.findById(newTask._id).populate("workers", "names gmail").populate("leader", "names gmail").populate("area_id", "name");

    setImmediate(async () => {
      try {
        await enviarCorreoCreacionTarea(taskPopulated);
      } catch (e) {
        console.error(" Error correo creación:", e.message);
      }
    });

    res.status(201).json({ message: "Tarea creada con éxito", task: taskPopulated });
  } catch (error) {
    console.error(" postTasks:", error);
    res.status(500).json({ error: "Error al crear tarea", details: error.message });
  }
};

const putTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // ✅ PRIMERO obtener la tarea
    const taskAntes = await Task.findById(id).populate("workers", "names gmail").populate("leader", "names gmail");

    if (!taskAntes) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    const estadoAnterior = taskAntes.stateTask;
    const updateData = { ...req.body };

    // ✅ AHORA SÍ usar taskAntes
    if (taskAntes.parentTask) {
      delete updateData.isMonthly;
      delete updateData.monthlyDay;
    }

    if (updateData.isMonthly) {
      if (!updateData.monthlyDay || updateData.monthlyDay < 1 || updateData.monthlyDay > 28) {
        return res.status(400).json({ error: "monthlyDay inválido (1–28)" });
      }
    }

    if (req.files?.length) {
      if (String(taskAntes.leader._id) !== String(userId)) {
        return res.status(403).json({ error: "Solo el líder puede adjuntar archivos" });
      }
    }

    if (updateData.workers) {
      if (typeof updateData.workers === "string") {
        updateData.workers = JSON.parse(updateData.workers);
      }
      if (!Array.isArray(updateData.workers)) {
        return res.status(400).json({ error: "Workers debe ser array" });
      }
    }

    if (req.files?.length) {
      const newFiles = [];
      for (const file of req.files) {
        const driveFile = await uploadToDrive(file);
        if (!driveFile) continue;
        newFiles.push({ filename: file.originalname, url: driveFile.webViewLink, drive_id: driveFile.id, uploaded_at: new Date() });
      }
      if (newFiles.length) {
        updateData.$push = { attached_files: { $each: newFiles } };
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true }).populate("workers", "names gmail").populate("leader", "names gmail");

    if (updateData.stateTask !== undefined && Number(updateData.stateTask) !== Number(estadoAnterior)) {
      setImmediate(async () => {
        try {
          await enviarCorreoCambioEstadoTarea(updatedTask, estadoAnterior);
        } catch (e) {
          console.error("⚠️ Error correo estado:", e.message);
        }
      });
    }

    res.json({ message: "Tarea actualizada", task: updatedTask });
  } catch (error) {
    console.error("❌ putTasks:", error.message);
    res.status(400).json({ error: "Error al actualizar tarea", details: error.message });
  }
};

const entregarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const taskAntes = await Task.findById(id).populate("workers", "names gmail").populate("leader", "names gmail");

    if (!taskAntes) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    if (String(taskAntes.leader._id) !== String(userId)) {
      return res.status(403).json({ error: "Solo el líder puede entregar la tarea" });
    }

    let driveFile = null;
    if (req.file) {
      driveFile = await uploadToDrive(req.file);
    }

    const task = await Task.findByIdAndUpdate(id, { stateTask: 2, deliveredAt: new Date(), deliveredFile: driveFile?.webViewLink || null }, { new: true }).populate("workers", "names gmail");

    if (taskAntes.stateTask !== 2) {
      setImmediate(async () => {
        try {
          await enviarCorreoCambioEstadoTarea(task, taskAntes.stateTask);
        } catch (e) {
          console.error("⚠️ Error correo entrega:", e.message);
        }
      });
    }

    res.json({ message: "Tarea entregada", task });
  } catch (error) {
    res.status(500).json({ error: "Error al entregar tarea" });
  }
};

const getTasks = async (req, res) => {
  const tasks = await Task.find().populate("workers", "names gmail").populate("leader", "names gmail");
  res.json(tasks);
};

const getTasksByWorker = async (req, res) => {
  const { worker } = req.params;

  if (!mongoose.Types.ObjectId.isValid(worker)) {
    return res.status(400).json({ error: "Worker inválido" });
  }

  const tasks = await Task.find({ workers: worker }).populate("workers", "names gmail").populate("leader", "names gmail");
  res.json(tasks);
};

export { postTasks, putTasks, getTasks, getTasksByWorker, entregarTarea, getMonthlyTasks };