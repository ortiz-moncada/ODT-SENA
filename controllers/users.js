import mongoose from "mongoose";
import usersModel from "../models/users.js";
import Task from "../models/tasks.js";
import bcrypt from "bcryptjs";
import { createToken } from "../middleware/createToken.js";
import users from "../models/users.js";

const ensureJefaturaArea = async () => {
  try {
    const Area = mongoose.model('Area');
    
    // Buscar si existe el área de Jefatura
    let jefatura = await Area.findOne({ name: "Jefatura General" });
    
    if (!jefatura) {
      console.log("📝 Creando área de Jefatura General...");
      jefatura = await Area.create({
        name: "Jefatura General",
        description: "Área de dirección general y administración superior",
        state: 1
      });
      console.log("✅ Área de Jefatura creada:", jefatura._id);
    }
    
    return jefatura._id;
  } catch (error) {
    console.error("❌ Error al crear/obtener área de Jefatura:", error);
    throw error;
  }
};

const loginUser = async (req, res) => {
  const { gmail, password } = req.body;

  try {
    // Buscar usuario por email
    const user = await usersModel
      .findOne({ gmail })
      .select("_id names gmail rol state areaId area_id password")
      .lean();

    console.log("🟢 Usuario encontrado:", user);

    if (!user) {
      return res.status(404).json({ 
        error: "Usuario no encontrado",
        message: "Usuario no encontrado" 
      });
    }

    // ✅ VALIDACIÓN DE USUARIO INACTIVO
    if (user.state === 2) {
      console.warn("⚠️ Intento de login con usuario inactivo:", user.names);
      return res.status(403).json({ 
        error: "Usuario inactivo",
        message: "Tu cuenta está inactiva. Contacta al administrador para reactivarla."
      });
    }

    // ✅ VALIDACIÓN ADICIONAL: Verificar que el estado sea exactamente 1 (activo)
    if (user.state !== 1) {
      console.warn("⚠️ Usuario con estado inválido:", user.state);
      return res.status(403).json({ 
        error: "Estado de usuario inválido",
        message: "Tu cuenta tiene un estado inválido. Contacta al administrador."
      });
    }

    // Validar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        error: "Contraseña incorrecta",
        message: "Contraseña incorrecta" 
      });
    }

    // ✅ Usuario activo y contraseña correcta - Generar token
    console.log("✅ Login exitoso para usuario activo:", user.names);

    const token = createToken(user);

    // Normalizar el campo de área (soportar ambos: areaId y area_id)
    const areaIdValue = user.areaId || user.area_id || null;

    console.log("🔍 areaId normalizado:", areaIdValue);

    const cleanUser = {
      _id: user._id,
      names: user.names,
      gmail: user.gmail,
      rol: user.rol,
      state: user.state,
      areaId: areaIdValue,
      area_id: areaIdValue
    };

    console.log("✅ Usuario que se enviará al frontend:", cleanUser);

    res.status(200).json({
      message: "Login exitoso",
      token,
      user: cleanUser,
    });

  } catch (error) {
    console.error("❌ Error en loginUser:", error);
    res.status(500).json({ 
      error: "Error en el servidor",
      message: "Error en el servidor", 
      details: error.message 
    });
  }
};

const postUser = async (req, res) => {
  try {
    console.log("Body recibido:", req.body);
    
    const userData = req.body.data || req.body;
    let { names, identification, gmail, phone, password, rol, date, areaId, area_id, state } = userData;
    
    if (!names || !identification || !gmail || !password || !rol) {
      return res.status(400).json({ 
        error: "Faltan campos obligatorios",
        required: ["names", "identification", "gmail", "password", "rol"]
      });
    }

    const existingUser = await usersModel.findOne({ 
      $or: [{ gmail }, { identification }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: "Ya existe un usuario con ese correo o cédula" 
      });
    }

    // ✅ LÓGICA PARA SUPER ADMIN (rol 1)
    let normalizedAreaId = areaId || area_id || null;
    
    if (rol === 1) {
      // Si es Super Admin y no tiene área, asignar Jefatura automáticamente
      if (!normalizedAreaId || normalizedAreaId === "null" || normalizedAreaId === "undefined") {
        console.log("🔍 Super Admin sin área, asignando Jefatura General...");
        
        try {
          normalizedAreaId = await ensureJefaturaArea();
          console.log("✅ Área de Jefatura asignada automáticamente:", normalizedAreaId);
        } catch (error) {
          console.error("❌ Error al asignar Jefatura:", error);
          return res.status(500).json({ 
            error: "Error al asignar área de Jefatura",
            details: error.message 
          });
        }
      }
    }

    // Validar que el área existe (para cualquier rol)
    if (normalizedAreaId && mongoose.Types.ObjectId.isValid(normalizedAreaId)) {
      const Area = mongoose.model('Area');
      const areaExists = await Area.findById(normalizedAreaId);
      
      if (!areaExists) {
        return res.status(400).json({ 
          error: "El área especificada no existe" 
        });
      }
    }

    const user = new usersModel({
      names,
      identification,
      gmail,
      phone,
      password,
      rol,
      date,
      areaId: normalizedAreaId,
      area_id: normalizedAreaId,
      state: state || 1
    });

    await user.save();
    
    console.log("✅ Usuario creado:", user._id);
    
    res.status(201).json({ 
      message: "Usuario creado exitosamente",
      user: {
        _id: user._id,
        names: user.names,
        gmail: user.gmail,
        rol: user.rol,
        areaId: user.areaId,
        area_id: user.area_id
      }
    });
  } catch (error) {
    console.error("❌ Error al guardar usuario:", error);
    res.status(400).json({ 
      error: "Error al guardar usuario",
      details: error.message 
    });
  }
};

const getUser = async (req, res) => {
  try {
    console.log("🔍 Obteniendo usuarios...");

    const users = await usersModel.find().lean();

    if (!users.length) {
      return res.status(404).json({ message: "No hay usuarios" });
    }

    const Area = mongoose.model("Area");

    const usersWithTasks = await Promise.all(
      users.map(async (user) => {
        
        // Tareas asociadas al usuario
        const tasks = await Task.find({ workers: user._id }).lean();

        // Normalizar el área
        const areaIdToSearch =
          user.areaId || user.area_id || user.tribute_id || null;

        let areaName = "Sin área";
        let areaDescription = "Sin descripción";

        // Buscar el área si existe
        if (areaIdToSearch && mongoose.Types.ObjectId.isValid(areaIdToSearch)) {
          try {
            const area = await Area.findById(areaIdToSearch).lean();
            if (area) {
              areaName = area.name;
              areaDescription = area.description;
            }
          } catch (err) {
            console.log(`⚠️ No se encontró área para ${user.names}`);
          }
        }

        // Usuario normalizado para frontend
        return {
          ...user,
          area_id: areaIdToSearch,
          areaId: areaIdToSearch,
          areaName,
          areaDescription,
          tasks,
        };
      })
    );

    console.log("📤 Enviando usuarios al frontend");
    res.json(usersWithTasks);

  } catch (error) {
    console.error("❌ Error detallado:", error);
    res.status(500).json({
      error: "Error al obtener usuarios",
      details: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID no es válido" });
    }

    const user = await usersModel.findById(id).lean();
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const Area = mongoose.model("Area");

    let areaName = "Sin área";
    let areaAdminName = "Sin área";

    const userAreaId = user.areaId || user.area_id;
    
    if (userAreaId) {
      const area = await Area.findById(userAreaId).lean();
      if (area) {
        areaName = area.name;
      }
    }

    if (user.rol === 2) {
      const areaAdmin = await Area.findOne({ admin: user._id }).lean();
      if (areaAdmin) {
        areaAdminName = areaAdmin.name;
      }
    }

    const tasks = await Task.find({ worker: id }).lean();

    res.json({
      ...user,
      area_id: userAreaId,
      areaId: userAreaId,
      areaName,
      areaAdminName,
      tasks
    });

  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({ error: "Error al obtener usuario", details: error.message });
  }
};

const putUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID no es válido" });
    }

    if (!password) {
      return res.status(400).json({ error: "Debe proporcionar una nueva contraseña" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await usersModel.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Contraseña actualizada correctamente", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falla en la operación" });
  }
};

const putUserAll = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID no es válido" });
    }

    const { password, areaId, area_id, ...rest } = req.body;

    const normalizedAreaId = areaId || area_id;
    if (normalizedAreaId) {
      rest.areaId = normalizedAreaId;
      rest.area_id = normalizedAreaId;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      rest.password = hashedPassword;
    }

    const user = await usersModel.findByIdAndUpdate(id, rest, { new: true });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario actualizado correctamente", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falla en la operación" });
  }
};

const getActive = async (req, res) => {
  try {
    const users = await usersModel.find({ state: 1 }).lean();

    if (!users.length) {
      return res.status(404).json({ message: "No hay usuarios activos" });
    }

    const usersWithTasks = await Promise.all(
      users.map(async (user) => {
        const tasks = await Task.find({ worker: user._id }).lean();
        const normalizedUser = {
          ...user,
          area_id: user.areaId || user.area_id || null,
          areaId: user.areaId || user.area_id || null,
          tasks: tasks
        };
        return normalizedUser;
      })
    );

    res.json(usersWithTasks);
  } catch (error) {
    console.error("Error al obtener usuarios activos:", error);
    res.status(500).json({ error: "Falla en la operación", details: error.message });
  }
};


const getInactive = async (req, res) => {
  try {
    const users = await usersModel.find({ state: 2 }).lean();

    if (!users.length) {
      return res.status(404).json({ message: "No hay usuarios inactivos" });
    }

    const usersWithTasks = await Promise.all(
      users.map(async (user) => {
        const tasks = await Task.find({ worker: user._id }).lean();
        const normalizedUser = {
          ...user,
          area_id: user.areaId || user.area_id || null,
          areaId: user.areaId || user.area_id || null,
          tasks: tasks
        };
        return normalizedUser;
      })
    );

    res.json(usersWithTasks);
  } catch (error) {
    console.error("Error al obtener usuarios inactivos:", error);
    res.status(500).json({ error: "Falla en la operación", details: error.message });
  }
};

const getCorreo = async (req, res) => {
  try {
    const { gmail } = req.params;
    const user = await users.findOne({ gmail });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const normalizedUser = {
      ...user.toObject(),
      area_id: user.areaId || user.area_id || null,
      areaId: user.areaId || user.area_id || null
    };

    res.status(200).json(normalizedUser);
  } catch (error) {
    console.error("Error al obtener usuario por correo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export {
  postUser, getUser, putUser, loginUser, putUserAll, getActive, getInactive, getUserById, getCorreo
}