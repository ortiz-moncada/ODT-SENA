import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ✅ OAUTH2 CON AUTO-REFRESH
async function getDriveAuth() {
  try {
    console.log('🔐 Iniciando autenticación con Google Drive (OAuth2)...');
    
    const { CLIENT_ID_DRIVE, CLIENT_SECRET, DRIVE_REFRESH_TOKEN } = process.env;
    
    if (!CLIENT_ID_DRIVE || !CLIENT_SECRET || !DRIVE_REFRESH_TOKEN) {
      throw new Error('Faltan credenciales OAuth2 en .env');
    }

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID_DRIVE,
      CLIENT_SECRET,
      'http://localhost:4000/oauth2callback'
    );

    // Configurar refresh token
    oauth2Client.setCredentials({
      refresh_token: DRIVE_REFRESH_TOKEN
    });

    // El cliente automáticamente refrescará el access token cuando expire
    console.log('✅ OAuth2 configurado con auto-refresh');
    
    return oauth2Client;

  } catch (error) {
    console.error('❌ Error al autenticar:', error.message);
    throw error;
  }
}

// ✅ SUBIR ARCHIVOS
async function uploadFileToDrive(files, folderName, apprenticeData, projectId = null, parentFolderId = null) {
  try {
    console.log('');
    console.log('📤 =================================================');
    console.log('   INICIANDO SUBIDA A GOOGLE DRIVE (OAuth2)');
    console.log('📤 =================================================');

    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const targetFolderId = parentFolderId || process.env.ID_FOLDER_DRIVE;

    if (!targetFolderId) {
      throw new Error('❌ ID_FOLDER_DRIVE no configurado');
    }

    console.log('📁 Carpeta destino ID:', targetFolderId);

    const uploadedFiles = [];
    const fileArray = files.file 
      ? (Array.isArray(files.file) ? files.file : [files.file])
      : Object.values(files);

    console.log(`📦 Total de archivos: ${fileArray.length}`);

    for (const file of fileArray) {
      console.log('');
      console.log(`📄 Procesando: ${file.name}`);
      console.log(`   Tamaño: ${file.size} bytes`);

      const fileMetadata = {
        name: file.name,
        parents: [targetFolderId]
      };

      const media = {
        mimeType: file.mimetype,
        body: file.data 
          ? Readable.from(file.data)
          : fs.createReadStream(file.tempFilePath)
      };

      console.log('⏳ Subiendo...');

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, webViewLink'
      });

      console.log('✅ Subido exitosamente');
      console.log(`   ID: ${response.data.id}`);
      console.log(`   URL: https://drive.google.com/file/d/${response.data.id}/view`);

      // Hacer público
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        console.log('✅ Archivo público');
      } catch (permError) {
        console.warn('⚠️ No se pudo hacer público');
      }

      uploadedFiles.push(response.data);
    }

    console.log('');
    console.log('✅ =================================================');
    console.log(`   ${uploadedFiles.length} ARCHIVO(S) SUBIDO(S)`);
    console.log('✅ =================================================');
    console.log('');

    return {
      ok: true,
      response: uploadedFiles
    };

  } catch (error) {
    console.error('');
    console.error('❌ ERROR AL SUBIR');
    console.error('Mensaje:', error.message);
    console.error('');
    
    return {
      ok: false,
      msg: 'Error al subir archivo',
      error: error.message
    };
  }
}

async function testDriveConnection() {
  try {
    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.list({
      pageSize: 5,
      fields: 'files(id, name)',
    });

    console.log('✅ Conexión exitosa');
    console.log(`📁 Archivos: ${res.data.files.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

export const driveServices = {
  uploadFileToDrive,
  getDriveAuth,
  testDriveConnection
};

export default driveServices;