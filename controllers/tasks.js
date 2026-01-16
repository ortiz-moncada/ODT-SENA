import mongoose from "mongoose";
import Task from "../models/tasks.js";
import { driveServices } from "../authDrive.js";
import { enviarCorreoCreacionTarea, enviarCorreoCambioEstadoTarea } from "../utils/taskEmails.js";

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
    console.log("📋 Headers:", req.headers);
    console.log("📦 Body:", req.body);
    console.log("📎 Files (multer):", req.files);
    console.log("📎 Files keys:", req.files ? Object.keys(req.files) : 'no files');
    
    let { name, description, tribute_id, stateTask, delivery_date, workers, leader, area_id, isMonthly, monthlyDay } = req.body;

    // Validaciones básicas
    if (!name || !description) return res.status(400).json({ error: "Nombre y descripción obligatorios" });
    if (!area_id || !mongoose.Types.ObjectId.isValid(area_id)) return res.status(400).json({ error: "Área inválida" });

    // Normalizar booleanos de FormData
    isMonthly = isMonthly === true || isMonthly === "true";

    if (isMonthly) {
      if (!monthlyDay || monthlyDay < 1 || monthlyDay > 28) {
        return res.status(400).json({ error: "Día mensual inválido (1-28)" });
      }
      delivery_date = undefined;
    } else if (!delivery_date) {
      return res.status(400).json({ error: "Fecha de entrega obligatoria para tareas no mensuales" });
    }

    // Parsear workers si vienen de FormData
    if (typeof workers === "string") workers = JSON.parse(workers);
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un trabajador" });
    }

    // Definir Líder
    if (workers.length > 1) {
      if (!leader) return res.status(400).json({ error: "Tareas grupales requieren un líder" });
    } else {
      leader = workers[0];
    }

    // Archivos adjuntos iniciales usando el nuevo sistema
    const attached_files = [];
    if (req.files && req.files.file) {
      try {
        // Preparar datos para driveServices
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
        // Continuar sin archivos si falla
      }
    }

    const newTask = new Task({
      name, description, tribute_id: tribute_id || req.user.id,
      stateTask: stateTask || 1,
      delivery_date, workers, leader, area_id,
      attached_files, isMonthly, monthlyDay
    });

    await newTask.save();
    
    const taskPopulated = await Task.findById(newTask._id)
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name");

    // Email asíncrono
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

    // 1. Validar Usuario
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "No autorizado", details: "Sesión inválida" });
    }
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de tarea inválido" });

    // 2. Obtener tarea antes de actualizar
    const taskAntes = await Task.findById(id).populate("leader");
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });

    const estadoAnterior = taskAntes.stateTask;
    let updateData = { ...req.body };

    // 3. Normalizar workers si vienen de FormData
    if (updateData.workers && typeof updateData.workers === "string") {
      updateData.workers = JSON.parse(updateData.workers);
    }

    // 4. Manejo de archivos usando el nuevo sistema (Solo líder puede adjuntar)
    if (req.files && req.files.file) {
      const leaderId = taskAntes.leader?._id || taskAntes.leader;
      if (String(leaderId) !== String(userId)) {
        return res.status(403).json({ error: "Solo el líder puede adjuntar archivos" });
      }

      try {
        // Preparar datos para driveServices
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

          // Usar $push para no sobreescribir los archivos previos
          updateData.$push = { attached_files: { $each: newFiles } };
          delete updateData.attached_files; // Evitar conflicto con el $push
        }
      } catch (error) {
        console.error("Error al subir archivos en actualización:", error);
        return res.status(500).json({ 
          error: "Error al subir archivos", 
          details: error.message 
        });
      }
    }

    // 5. Ejecutar actualización
    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate("workers", "names gmail")
      .populate("leader", "names gmail");

    // 6. Notificar cambio de estado si aplica
    if (updateData.stateTask && Number(updateData.stateTask) !== Number(estadoAnterior)) {
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

    const taskAntes = await Task.findById(id);
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });

    // Validar que el que entrega es el líder
    if (String(taskAntes.leader) !== String(req.user.id)) {
      return res.status(403).json({ error: "Solo el líder asignado puede entregar" });
    }

    let deliveredFileUrl = null;
    let driveFileId = null;
    
    if (req.files && req.files.file) {
      try {
        // Preparar datos para driveServices
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
      stateTask: 2, // En Revisión
      deliveredAt: new Date(),
      deliveredFile: deliveredFileUrl,
      driveStatus: deliveredFileUrl ? "OK" : "FAILED"
    }, { new: true }).populate("workers leader");

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