import path from "path";
import fs from "fs";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const uploadFile = async (files, allowedExtensions = []) => {
  try {
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileArray = Array.isArray(files.file) ? files.file : [files.file];
    const uploadedFiles = [];

    for (const file of fileArray) {
      const ext = path.extname(file.name).toLowerCase().replace(".", "");
      
      if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
        return {
          ok: false,
          msg: `Extensión .${ext} no permitida. Solo: ${allowedExtensions.join(", ")}`,
        };
      }

      const fileName = `${Date.now()}_${file.name}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);
      uploadedFiles.push(fileName);
    }

    return uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles;
  } catch (error) {
    console.error("Error en uploadFile:", error);
    return { ok: false, msg: "Error al procesar el archivo" };
  }
};

export default uploadFile;