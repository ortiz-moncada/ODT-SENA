// controllers/tasks.js
import mongoose from "mongoose";
import Task from "../models/tasks.js";
import { uploadToDrive } from "../utils/googleDrive.js"; // Utilidad que CREASTE
import { enviarCorreoCreacionTarea } from "../utils/taskEmails.js";



const postTasks = async (req, res) => {
  try {
    let { name, description, tribute_id, stateTask, delivery_date, workers, area_id } = req.body;

    console.log(" Datos recibidos en POST /tasks/create:", req.body);


    // VALIDACIONES
    if (!area_id || !mongoose.Types.ObjectId.isValid(area_id)) {
      return res.status(400).json({ error: "El área es obligatoria y debe ser válida" });
    }

    //  ARREGLAR tribute_id = undefined
    let tributeValue = null;
    if (tribute_id && 
        tribute_id !== "null" && 
        tribute_id !== "undefined" && 
        tribute_id !== "0" && 
        tribute_id !== "Seleccione") {
      
      if (!mongoose.Types.ObjectId.isValid(tribute_id)) {
        return res.status(400).json({ error: "El tribute_id no es válido" });
      }
      tributeValue = tribute_id;
    }

    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Debe proporcionar al menos un trabajador" });
    }

    const invalidWorkerIds = workers.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidWorkerIds.length > 0) {
      return res.status(400).json({ error: "IDs de trabajadores no válidos", invalidWorkerIds });
    }

    // SUBIR ARCHIVOS A DRIVE
    const attached_files = [];

    if (req.files && req.files.length > 0) {
      console.log(` Subiendo ${req.files.length} archivo(s) a Google Drive...`);

      for (const file of req.files) {
        try {
          const driveFile = await uploadToDrive(file);

          if (!driveFile || !driveFile.webViewLink) {
            console.error(" uploadToDrive no retornó webViewLink:", driveFile);
            return res.status(500).json({
              error: "Error al subir archivo a Google Drive",
              details: "No se recibió webViewLink del archivo"
            });
          }

          attached_files.push({
            filename: file.originalname,
            url: driveFile.webViewLink,
            drive_id: driveFile.id,
            uploaded_at: new Date()
          });

          console.log(" Archivo subido:", file.originalname);

        } catch (uploadError) {
          console.error(" Error al subir archivo:", uploadError);
          return res.status(500).json({
            error: "Error al subir archivo a Google Drive",
            details: uploadError.message
          });
        }
      }
    } else {
      console.log("⚠️ No se enviaron archivos adjuntos");
    }

    // CREAR TAREA
    const newTask = new Task({
      name,
      description,
      tribute_id: tributeValue,
      stateTask: stateTask || 1,
      delivery_date,
      workers,
      area_id,
      attached_files
    });

    await newTask.save();

    const taskPopulated = await Task.findById(newTask._id)
      .populate("workers", "names gmail rol state")
      .populate("area_id", "name")
      .populate("tribute_id", "names gmail");
setImmediate(async () => {
  try {
    const { enviarCorreoCreacionTarea } = await import("../utils/taskEmails.js");
    await enviarCorreoCreacionTarea(taskPopulated);
  } catch (e) {
    console.error("⚠️ Error correo:", e.message);
  }
});
    res.status(201).json({
      message: "Tarea creada con éxito",
      task: taskPopulated
    });

  } catch (error) {
    console.error("❌ Error al crear tarea:", error);
    res.status(500).json({ 
      error: "Error al crear tarea", 
      details: error.message 
    });
  }
};

//  GET: VER TODAS LAS TAREAS
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("workers", "names gmail rol state");
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: "Error al ver las tareas" });
  }
};


// GET: TAREAS POR TRABAJADOR
const getTasksByWorker = async (req, res) => {
  try {
    const { worker } = req.params;

    if (!mongoose.Types.ObjectId.isValid(worker)) {
      return res.status(400).json({ error: "ID del usuario no válido" });
    }

    const tasks = await Task.find({ workers: worker }).populate("workers", "names gmail rol state");

    if (!tasks.length) {
      return res.status(404).json({ message: "No hay tareas asignadas" });
    }

    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: "Error al obtener tareas del usuario" });
  }
};


// PUT: ACTUALIZAR TAREA
const putTasks = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID no válido" });
    }

    const updateData = req.body;

    if (updateData.workers) {
      req.body.workers = JSON.parse(req.body.workers);

      if (!Array.isArray(updateData.workers)) {
        return res.status(400).json({ error: "Workers debe ser array" });
      }

      const invalidIds = updateData.workers.filter(w => !mongoose.Types.ObjectId.isValid(w));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: "IDs no válidos", invalidIds });
      }
    }

    // =========================
    // AGREGAR NUEVOS ARCHIVOS A DRIVE
    // =========================
    if (req.files && req.files.length > 0) {
      const newFiles = [];

      for (const file of req.files) {
        const driveFile = await uploadToDrive(file);

        newFiles.push({
          filename: file.originalname,
          url: driveFile.webViewLink,
          drive_id: driveFile.id,
          uploaded_at: new Date()
        });
      }

      updateData.$push = { attached_files: { $each: newFiles } };
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate("workers", "names gmail rol state");

    if (!updatedTask) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    res.json({ message: "Tarea actualizada", task: updatedTask });

  } catch (error) {
    res.status(400).json({ error: "Error al actualizar tarea", details: error.message });
  }
};


// GET: TAREAS ACTIVAS
const getActiveTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ stateTask: 1 })
      .populate("workers", "names gmail rol state");
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: "Error al obtener activas" });
  }
};


// GET: TAREAS INACTIVAS
const getInactiveTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ stateTask: 2 })
      .populate("workers", "names gmail rol state");
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: "Error al obtener inactivas" });
  }
};


/* // PUT: ENTREGAR TAREA
const deliverTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_comment, delivered_by } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de tarea inválido" });
    }
    if (!mongoose.Types.ObjectId.isValid(delivered_by)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    let delivery_file = null;

    // =========================
    // SUBIR ARCHIVO DE ENTREGA A DRIVE
    // =========================
    if (req.file) {
      const driveFile = await uploadToDrive(req.file);
      delivery_file = driveFile.webViewLink;
    }

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        delivery_file,
        delivery_comment,
        delivery_date_real: new Date(),
        delivered_by,
        stateTask: 2
      },
      { new: true }
    ).populate("delivered_by", "names gmail");

    if (!updated) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    res.json({ message: "Tarea entregada", task: updated });

  } catch (error) {
    console.error("❌ Error al entregar tarea:", error);
    res.status(500).json({ error: "Error al entregar tarea" });
  }



}; */

// POST: ENTREGAR TAREA (NUEVA)
const entregarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    let driveFile = null;

    if (file) {
      try {
        driveFile = await uploadToDrive(file);
      } catch (driveError) {
        console.error("⚠️ Drive falló, pero la tarea continúa:", driveError.message);
      }
    }

    const task = await Task.findByIdAndUpdate(
      id,
      {
        stateTask: 2, 
        deliveredAt: new Date(),
        deliveredFile: driveFile?.webViewLink || null,
        driveStatus: driveFile ? "OK" : "FAILED",
      },
      { new: true }
    );

    res.json({
      message: "Tarea entregada correctamente",
      task,
      driveWarning: !driveFile
        ? "Archivo no subido a Drive, se guardará posteriormente"
        : null,
    });

  } catch (error) {
    console.error("❌ Error crítico en entregar Tarea:", error);
    res.status(500).json({
      error: "Error al entregar tarea",
    });
  }
};



export {
  postTasks,
  getTasks,
  getTasksByWorker,
  putTasks,
  getActiveTasks,
  getInactiveTasks,
  entregarTarea
};
