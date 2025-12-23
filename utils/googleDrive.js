import { google } from "googleapis";
import fs from "fs";

const CREDENTIALS_PATH = "./credentials-oauth.json";
const TOKEN_PATH = "./token.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

//  ID de tu carpeta en Google Drive
const FOLDER_ID = "1PqHMgnu5MgspMUbz2TZLYTlCfoQSZvaR";

// Función para obtener el cliente OAuth2
function getOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

export async function uploadToDrive(file) {
  try {
    const auth = getOAuth2Client();
    const driveService = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: file.originalname,
      parents: [FOLDER_ID], //  Subir a carpeta específica
    };

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    console.log(" Subiendo archivo a Drive:", file.originalname);

    // SUBIR ARCHIVO
    const response = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    const fileId = response.data.id;
    console.log(" Archivo creado con ID:", fileId);

    // DAR PERMISOS DE LECTURA PUBLICA
    await driveService.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    console.log(" Permisos públicos asignados");

    // OBTENER LINK PUBLICO
    const result = await driveService.files.get({
      fileId: fileId,
      fields: "id, name, webViewLink, webContentLink",
    });

    console.log(" Archivo subido exitosamente:", result.data);

    //  ELIMINAR ARCHIVO TEMPORAL
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      console.log(" Archivo temporal eliminado");
    }

    return {
      id: fileId,
      webViewLink: result.data.webViewLink,
      webContentLink: result.data.webContentLink,
    };

  } catch (err) {
    console.error(" Error en uploadToDrive():", err);

    // Limpiar archivo temporal si existe
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    throw new Error(`Error al subir archivo a Google Drive: ${err.message}`);
  }
}