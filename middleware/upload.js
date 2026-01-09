import multer from "multer";


// 🔹 NO disco, NO carpetas, SOLO memoria
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Tipo de archivo no permitido"), false);
  }

  cb(null, true);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});
