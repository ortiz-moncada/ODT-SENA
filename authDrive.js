import readline from "readline";
import "dotenv/config";
import { google } from "googleapis";
const { OAuth2 } = google.auth;
import fs from "fs";
import path from "path";
import url from "url";
import uploadFile from "./utils/uploadFile.util.js";

const driveServices = {};

const {
  CLIENT_ID_DRIVE,
  CLIENT_SECRET,
  REDIRECT_URI,
  DRIVE_REFRESH_TOKEN,
  ID_FOLDER_DRIVE,
} = process.env;

const generateAuthCredentials = () => {
  const SCOPES = ["https://www.googleapis.com/auth/drive"];

  const oAuth2Client = new OAuth2(CLIENT_ID_DRIVE, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("1. Autoriza esta aplicación abriendo esta URL en tu navegador:");
  console.log(authUrl);

  const readLine = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readLine.question(
    "2. Pega el código que Google te dio después de la autorización: ",
    (code) => {
      readLine.close();

      oAuth2Client.getToken(code, (error, token) => {
        if (error) {
          return console.error("Error al obtener el token:", error);
        }
        console.log(`REFRESH_TOKEN: ${token.refresh_token}`);
        console.log(`ACCESS_TOKEN: ${token.access_token}`);
      });
    }
  );
};

const getDriveClient = async () => {
  const oAuth2Client = new OAuth2(CLIENT_ID_DRIVE, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: DRIVE_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth: oAuth2Client });
};

const permissionFile = async (fileId) => {
  try {
    const drive = await getDriveClient();
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (error) {
    return ({ msg: "Ha ocurrido un error en la verificación de permisos. Por favor, intenta más tarde.", error });
  }
}

driveServices.listFolders = async (parentFolderId) => {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
    });
    const folders = response.data.files;
    return ({ success: true, folders: folders, size: folders.length });
  } catch (error) {
    console.error("Error al listar carpetas:", error);
    return ({
      success: false,
      msg: "Error al obtener la lista de carpetas de Drive.",
    });
  }
};

driveServices.findOrCreateFolder = async (folderName, folderId = ID_FOLDER_DRIVE) => {
  const parameter = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and name contains '${folderName}' and trashed=false`;

  const drive = await getDriveClient();

  const response = await drive.files.list({
    q: parameter,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const existingFolder = response.data.files[0];

  if (existingFolder) {
    return existingFolder.id;
  }
  else {
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [folderId],
    };
    const newFolder = await drive.files.create({
      resource: folderMetadata,
      fields: "id",
    });

    return newFolder.data.id;
  }
};

driveServices.downloadFileFromDrive = async (req, res) => {
  try {
    let { fileId } = req.params;
    await permissionFile(fileId);
    const fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    res.status(200).json({ msg: { fileUrl } });
  } catch (error) {
    res.status(500).json({
      msg: "Ha ocurrido un error en el servidor. Por favor, intenta más tarde.",
      error,
    });
  }
};

driveServices.viewFileFromDrive = async (req, res) => {
  try {
    let { fileId } = req.params;
    await permissionFile(fileId);
    const fileUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    res.status(200).json({ msg: { fileUrl } });
  }
  catch (error) {
    res.status(500).json({ msg: "Ha ocurrido un error en el servidor. Por favor, intenta más tarde.", error, })
  };
}

driveServices.uploadFileToDrive = async (files, activityType, apprentice = null, fileId = null, folderParent,) => {

  let fileNames = await uploadFile(files, ["pdf", "jpg"]);

  if (fileNames.ok === false) {
    return { ok: false, msg: fileNames.msg };
  }

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

  // Aseguramos que sea un array, así podemos iterar
  if (!Array.isArray(fileNames)) fileNames = [fileNames];

  const drive = await getDriveClient();
  const mimeType = Array.isArray(files.file) ? files.file[0].mimetype : files.file.mimetype;

  const uploadedFiles = [];

  try {

    for (const fileName of fileNames) {
      const filePath = path.join(__dirname, "uploads/", fileName);
      // ACTUALIZAR ARCHIVO SI SE ENVIA EL fileId
      if (fileId != null) {
        const findToFile = await drive.files.get({
          fileId,
          fields: "id",
        });
        if (findToFile.data.id) {
          await drive.files.update({
            fileId,
            media: {
              mimeType: mimeType,
              body: fs.createReadStream(filePath),
            },
          });
          uploadedFiles.push({ id: fileId });
          continue;
        }
      }
      // Buscar o crear carpeta destino
      const folderResult = await driveServices.findOrCreateFolder(`${activityType}`, folderParent);


      // Contar cuántos archivos hay en esa carpeta
      const result = await driveServices.listFolders(folderResult);
      const fileNumber = result.size + 1;

      let newFileName = null;

      if (apprentice != null) {
        newFileName = `${fileNumber}_${activityType}_${apprentice.firstName}_${apprentice.lastName}_${apprentice.documentNumber}`;
      } else {
        newFileName = `${fileNumber}_${activityType}`;
      }

      const fileMetadata = {
        name: newFileName,
        parents: [folderResult],
      };

      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, name",
      });

      uploadedFiles.push({
        msg: "Archivo guardado correctamente",
        fileNumber,
        id: response.data.id,
        name: response.data.name,
      });

      fs.unlinkSync(filePath);
    }

    return {
      response: uploadedFiles.length === 1 ? [uploadedFiles[0]] : uploadedFiles,
    };
  } catch (error) {
    console.error("Error al subir el archivo a Google Drive:", error);
    return {
      ok: false,
      msg: "Ha ocurrido un error al subir el archivo a Google Drive. Por favor, intenta de nuevo.",
    };
  }
};

export { driveServices };