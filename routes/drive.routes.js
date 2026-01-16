import { Router } from "express";
import { driveServices } from "../authDrive.js";

const router = Router();

// Subir archivo a Drive
router.post("/upload", async (req, res) => {
  try {
    const fileData = req.files?.file || req.files?.File;
    
    if (!fileData) {
      return res.status(400).json({ 
        ok: false, 
        msg: "No se ha enviado ningún archivo" 
      });
    }

    // Valores por defecto si no vienen en el body
    const activityType = req.body?.activityType || "documentos";
    const firstName = req.body?.firstName || null;
    const lastName = req.body?.lastName || null;
    const documentNumber = req.body?.documentNumber || null;

    const apprentice = firstName ? {
      firstName,
      lastName,
      documentNumber
    } : null;

    // Normalizar
    req.files.file = fileData;

    const result = await driveServices.uploadFileToDrive(
      req.files,
      activityType,
      apprentice,
      null,
      process.env.ID_FOLDER_DRIVE
    );

    if (result.ok === false) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      ok: true,
      msg: "Archivo subido exitosamente",
      data: result.response
    });

  } catch (error) {
    console.error("Error en ruta upload:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al subir archivo",
      error: error.message
    });
  }
});

// Descargar archivo de Drive
router.get("/download/:fileId", driveServices.downloadFileFromDrive);

// Ver archivo de Drive
router.get("/view/:fileId", driveServices.viewFileFromDrive);

// Listar carpetas - carpeta por defecto
router.get("/folders", async (req, res) => {
  try {
    const result = await driveServices.listFolders(process.env.ID_FOLDER_DRIVE);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Error al listar carpetas",
      error: error.message
    });
  }
});

// Listar carpetas - carpeta específica
router.get("/folders/:folderId", async (req, res) => {
  try {
    const result = await driveServices.listFolders(req.params.folderId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Error al listar carpetas",
      error: error.message
    });
  }
});

export default router;