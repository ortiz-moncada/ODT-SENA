import mongoose from "mongoose";
import Task from "../models/tasks.js";
import Notification from "../models/notify.js";
import User from "../models/users.js";
import { driveServices } from "../authDrive.js";
import { enviarCorreoCreacionTarea, enviarCorreoCambioEstadoTarea } from "../utils/taskEmails.js";

// --- CREAR TAREA CON DEBUGGING COMPLETO ---
export const postTasks = async (req, res) => {
  try {
    console.log("========================================");
    console.log("📥 POST /tasks/create - DEBUGGING COMPLETO");
    console.log("========================================");
    console.log("req.body:", JSON.stringify(req.body, null, 2));
    console.log("req.files:", req.files);
    
    if (req.files) {
      console.log("Estructura completa de req.files:");
      console.log(JSON.stringify(req.files, null, 2));
      
      if (req.files.file) {
        console.log("✅ req.files.file existe");
        console.log("   - name:", req.files.file.name);
        console.log("   - size:", req.files.file.size);
        console.log("   - mimetype:", req.files.file.mimetype);
        console.log("   - tempFilePath:", req.files.file.tempFilePath);
        console.log("   - data (Buffer):", req.files.file.data ? "SÍ" : "NO");
      }
    }
    console.log("========================================");
    
    let { name, description, tribute_id, stateTask, delivery_date, workers, leader, area_id, isMonthly, monthlyDay } = req.body;

    // Validaciones básicas
    if (!name || !description) {
      return res.status(400).json({ error: "Nombre y descripción obligatorios" });
    }
    
    if (!area_id || !mongoose.Types.ObjectId.isValid(area_id)) {
      return res.status(400).json({ error: "Área inválida" });
    }

    // Lógica de fechas
    isMonthly = isMonthly === true || isMonthly === "true";
    if (isMonthly) {
      if (!monthlyDay || monthlyDay < 1 || monthlyDay > 28) {
        return res.status(400).json({ error: "Día mensual inválido (1-28)" });
      }
      delivery_date = undefined;
    } else if (!delivery_date) {
      return res.status(400).json({ error: "Fecha de entrega obligatoria" });
    }

    // Parseo de trabajadores
    if (typeof workers === "string") {
      try {
        workers = JSON.parse(workers);
      } catch (e) {
        return res.status(400).json({ error: "Formato de trabajadores inválido" });
      }
    }
    
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un trabajador" });
    }

    if (workers.length > 1) {
      if (!leader) {
        return res.status(400).json({ error: "Tareas grupales requieren un líder" });
      }
    } else {
      leader = workers[0];
    }

    const attached_files = [];

    // ✅ DEBUGGING EXHAUSTIVO DE GOOGLE DRIVE
    if (req.files && req.files.file) {
      console.log("");
      console.log("🚀 INICIANDO PROCESO DE SUBIDA A GOOGLE DRIVE");
      console.log("=".repeat(60));
      
      try {
        const apprenticeData = {
          firstName: "Tarea",
          lastName: name.replace(/\s+/g, "_"),
          documentNumber: Date.now().toString()
        };

        console.log("📋 Datos del aprendiz preparados:");
        console.log(JSON.stringify(apprenticeData, null, 2));
        
        console.log("");
        console.log("📤 Llamando a driveServices.uploadFileToDrive...");
        console.log("   Parámetros:");
        console.log("   - files: req.files (objeto completo)");
        console.log("   - folderName: 'tareas_adjuntas'");
        console.log("   - apprenticeData:", apprenticeData);
        console.log("   - projectId: null");
        console.log("   - parentFolderId:", process.env.ID_FOLDER_DRIVE);
        
        console.log("");
        console.log("⏳ Esperando respuesta de Google Drive...");
        
        const uploadResult = await driveServices.uploadFileToDrive(
          req.files,
          "tareas_adjuntas",
          apprenticeData,
          null,
          process.env.ID_FOLDER_DRIVE
        );

        console.log("");
        console.log("📬 RESPUESTA DE GOOGLE DRIVE:");
        console.log("=".repeat(60));
        console.log("uploadResult completo:", JSON.stringify(uploadResult, null, 2));
        console.log("");

        if (!uploadResult) {
          console.error("❌ uploadResult es null o undefined");
          throw new Error("La función uploadFileToDrive devolvió null");
        }

        if (!uploadResult.response) {
          console.error("❌ uploadResult.response no existe");
          console.error("Contenido de uploadResult:", uploadResult);
          throw new Error("uploadResult.response es undefined");
        }

        if (!Array.isArray(uploadResult.response)) {
          console.error("❌ uploadResult.response NO es un array");
          console.error("Tipo:", typeof uploadResult.response);
          console.error("Contenido:", uploadResult.response);
          throw new Error("uploadResult.response no es un array");
        }

        if (uploadResult.response.length === 0) {
          console.error("❌ uploadResult.response está VACÍO");
          throw new Error("No se subió ningún archivo (array vacío)");
        }

        console.log("✅ uploadResult.response es un array con", uploadResult.response.length, "archivo(s)");
        console.log("");

        uploadResult.response.forEach((file, index) => {
          console.log(`📄 Archivo ${index + 1}:`);
          console.log("   - id:", file.id);
          console.log("   - name:", file.name);
          console.log("   - mimeType:", file.mimeType);
          
          const fileUrl = `https://drive.google.com/file/d/${file.id}/view`;
          
          attached_files.push({
            filename: file.name,
            url: fileUrl,
            drive_id: file.id,
            uploaded_at: new Date()
          });
          
          console.log("   - URL generada:", fileUrl);
          console.log("");
        });
        
        console.log("✅ SUBIDA A DRIVE COMPLETADA EXITOSAMENTE");
        console.log("   Total de archivos subidos:", attached_files.length);
        console.log("=".repeat(60));
        console.log("");
        
      } catch (driveError) {
        console.error("");
        console.error("❌ ERROR CRÍTICO EN GOOGLE DRIVE");
        console.error("=".repeat(60));
        console.error("Tipo de error:", driveError.constructor.name);
        console.error("Mensaje:", driveError.message);
        console.error("Stack:", driveError.stack);
        console.error("=".repeat(60));
        console.error("");
        
        // NO FALLAR LA TAREA, pero reportar el error
        console.warn("⚠️ Continuando creación de tarea SIN archivo adjunto");
        
        // Opcional: descomentar esto si quieres que falle la tarea cuando falla Drive
        // return res.status(500).json({ 
        //   error: "Error al subir archivo a Google Drive",
        //   details: driveError.message 
        // });
      }
    } else {
      console.log("ℹ️ No se recibió archivo para adjuntar (req.files o req.files.file no existe)");
    }

    // Crear la tarea
    const creadorId = tribute_id || req.user?.id;
    
    console.log("");
    console.log("💾 GUARDANDO TAREA EN BASE DE DATOS");
    console.log("=".repeat(60));
    console.log("Datos de la tarea:");
    console.log("   - name:", name);
    console.log("   - creador:", creadorId);
    console.log("   - workers:", workers);
    console.log("   - attached_files:", attached_files.length, "archivo(s)");
    console.log("");
    
    const newTask = new Task({
      name,
      description,
      tribute_id: creadorId,
      stateTask: stateTask || 1,
      delivery_date,
      workers,
      leader,
      area_id,
      attached_files,
      isMonthly,
      monthlyDay
    });

    await newTask.save();
    
    console.log("✅ Tarea guardada en BD con ID:", newTask._id);
    console.log("   - attached_files guardados:", newTask.attached_files.length);
    
    if (newTask.attached_files.length > 0) {
      console.log("   - URLs de archivos:");
      newTask.attached_files.forEach((file, i) => {
        console.log(`     ${i + 1}. ${file.url}`);
      });
    }
    console.log("=".repeat(60));
    console.log("");

    // Poblar datos para respuesta
    const taskPopulated = await Task.findById(newTask._id)
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name");

    // Notificaciones
    await notificarCreacionTarea(taskPopulated, creadorId);
    
    // Email asíncrono
    setImmediate(() => {
      enviarCorreoCreacionTarea(taskPopulated).catch(err => {
        console.error("Error al enviar email:", err);
      });
    });

    console.log("✅ PROCESO COMPLETADO EXITOSAMENTE");
    console.log("========================================");
    console.log("");

    res.status(201).json({ 
      message: "Tarea creada exitosamente",
      task: taskPopulated 
    });
    
  } catch (error) {
    console.error("");
    console.error("❌ ERROR GENERAL EN postTasks");
    console.error("=".repeat(60));
    console.error("Tipo:", error.constructor.name);
    console.error("Mensaje:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(60));
    console.error("");
    
    res.status(500).json({ 
      error: "Error al crear tarea",
      details: error.message 
    });
  }
};

// --- FUNCIONES DE NOTIFICACIÓN (SIN CAMBIOS) ---
const crearNotificacionCambioEstado = async (tarea, estadoAnterior, nuevoEstado, usuarioQueCambio) => {
  try {
    const trabajadores = tarea.workers || [];
    const creadorId = (tarea.tribute_id?._id || tarea.tribute_id || '').toString();
    const usuariosNotificados = new Set();
    
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
    } catch (error) {
      console.error("Error al notificar:", error.message);
    }
    
    for (const trabajador of trabajadores) {
      const trabajadorId = (trabajador._id || trabajador).toString();
      if (usuariosNotificados.has(trabajadorId)) continue;
      
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
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
    
    if (creadorId && !usuariosNotificados.has(creadorId) && mongoose.Types.ObjectId.isValid(creadorId)) {
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
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error al crear notificaciones:", error);
  }
};

const notificarCreacionTarea = async (tarea, creadorId) => {
  try {
    const trabajadores = tarea.workers || [];
    const usuariosNotificados = new Set();
    
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
    } catch (error) {
      console.error("Error:", error.message);
    }
    
    for (const trabajador of trabajadores) {
      const trabajadorId = (trabajador._id || trabajador).toString();
      if (usuariosNotificados.has(trabajadorId)) continue;
      
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
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error al notificar creación:", error);
  }
};

const notificarEntregaTarea = async (tarea, usuarioQueEntrego) => {
  try {
    const trabajadores = tarea.workers || [];
    const creadorId = (tarea.tribute_id?._id || tarea.tribute_id || '').toString();
    const usuariosNotificados = new Set();
    
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
    } catch (error) {
      console.error("Error:", error.message);
    }
    
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
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
    
    if (creadorId && !usuariosNotificados.has(creadorId) && mongoose.Types.ObjectId.isValid(creadorId)) {
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
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error al notificar entrega:", error);
  }
};

// --- OTROS MÉTODOS ---
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name");
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
    
    const tasks = await Task.find({ workers: worker })
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name");
    res.json(tasks);
  } catch (error) {
    console.error("Error en getTasksByWorker:", error);
    res.status(500).json({ error: "Error al obtener tareas del trabajador" });
  }
};

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

export const putTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const taskAntes = await Task.findById(id);
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });
    const estadoAnterior = taskAntes.stateTask;
    let updateData = { ...req.body };
    if (req.files && req.files.file) {
      const apprenticeData = {
        firstName: "Tarea_Update",
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
      }
    }
    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name")
      .populate("tribute_id", "names gmail");
    if (updateData.stateTask && Number(updateData.stateTask) !== Number(estadoAnterior)) {
      await crearNotificacionCambioEstado(updatedTask, estadoAnterior, updateData.stateTask, userId);
      setImmediate(() => enviarCorreoCambioEstadoTarea(updatedTask, estadoAnterior).catch(console.error));
    }
    res.json({ message: "Tarea actualizada exitosamente", task: updatedTask });
  } catch (error) {
    console.error("❌ Error en putTasks:", error);
    res.status(500).json({ error: "Error al actualizar tarea", details: error.message });
  }
};

export const entregarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: "No autorizado" });
    const taskAntes = await Task.findById(id).populate("area_id").populate("tribute_id").populate("workers").populate("leader");
    if (!taskAntes) return res.status(404).json({ error: "Tarea no encontrada" });
    if (String(taskAntes.leader?._id || taskAntes.leader) !== String(req.user.id)) {
      return res.status(403).json({ error: "Solo el líder asignado puede entregar esta tarea" });
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
      } catch (driveError) {
        console.error("❌ ERROR al subir archivo de entrega:", driveError);
        return res.status(500).json({ error: "Error al subir archivo de entrega a Google Drive", details: driveError.message });
      }
    } else {
      return res.status(400).json({ error: "Debe adjuntar un archivo para entregar la tarea" });
    }
    const task = await Task.findByIdAndUpdate(id, {
      stateTask: 2,
      deliveredAt: new Date(),
      deliveredFile: deliveredFileUrl,
      driveStatus: deliveredFileUrl ? "OK" : "FAILED"
    }, { new: true })
      .populate("workers", "names gmail")
      .populate("leader", "names gmail")
      .populate("area_id", "name")
      .populate("tribute_id", "names gmail");
    await notificarEntregaTarea(task, req.user.id);
    setImmediate(() => enviarCorreoCambioEstadoTarea(task, taskAntes.stateTask).catch(console.error));
    res.json({ message: "Tarea enviada a revisión exitosamente", task });
  } catch (error) {
    console.error("❌ Error en entregarTarea:", error);
    res.status(500).json({ error: "Error al entregar tarea", details: error.message });
  }
};