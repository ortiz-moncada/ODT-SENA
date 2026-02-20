import mongoose from "mongoose";
import Area from "../models/areas.js";
import areaModel from "../models/areas.js";
import usersModel from "../models/users.js"; 

const postArea = async (req, res) => {
    try {
        const { name, description, admin, worker = [] } = req.body;

        // Validaciones básicas
        if (!name || !description || !admin) {
            return res.status(400).json({ error: "Faltan datos requeridos" });
        }

        // Validar si el admin existe
        const adminUser = await usersModel.findById(admin);
        if (!adminUser) {
            return res.status(400).json({ error: "El administrador no existe" });
        }

        // Crear área
        const newArea = await Area.create({
            name,
            description,
            admin,
            worker
        });

        // Asignar automáticamente área al admin
        await usersModel.findByIdAndUpdate(admin, {
            areaId: newArea._id
        });

        // Asignar área a los trabajadores si vienen
        if (worker.length > 0) {
            await usersModel.updateMany(
                { _id: { $in: worker } },
                { areaId: newArea._id }
            );
        }

        return res.status(201).json({
            message: "Área creada correctamente",
            area: newArea
        });

    } catch (error) {
        console.error("❌ Error al crear área:", error);
        return res.status(400).json({ error: "Error al crear área" });
    }
};
const getArea = async (req, res) => {
  try {
    const areas = await areaModel.find()
    .populate('admin', 'names')
    .populate("worker", "names");

    res.json(areas);
  } catch (error) {
    res.status(400).json({ error: "Error al ver las áreas" });
  }
};
const putArea = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID no es válido" });
    }

    // Buscar el área actual antes de actualizar
    const areaActual = await Area.findById(id);
    if (!areaActual) {
      return res.status(404).json({ error: "Área no encontrada" });
    }

    const { name, description, admin, state, worker } = req.body;

    // Si hay un nuevo admin y es diferente al actual
    if (admin && admin !== areaActual.admin.toString()) {
      
      // Validar que el nuevo admin existe
      const nuevoAdmin = await usersModel.findById(admin);
      if (!nuevoAdmin) {
        return res.status(400).json({ error: "El administrador no existe" });
      }

      // Remover el área del admin anterior (si existe)
      if (areaActual.admin) {
        await usersModel.findByIdAndUpdate(
          areaActual.admin,
          { $unset: { areaId: "" } }
        );
      }

      // Asignar área al nuevo admin
      await usersModel.findByIdAndUpdate(admin, {
        areaId: id
      });
    }

    // Preparar datos de actualización
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (admin) updateData.admin = admin;
    if (state !== undefined) updateData.state = state;
    if (worker) updateData.worker = worker;

    // Actualizar el área
    const areaActualizada = await Area.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('admin', 'names').populate('worker', 'names');

    res.status(200).json({
      message: "Área actualizada correctamente",
      area: areaActualizada
    });

  } catch (error) {
    console.error("❌ Error al actualizar área:", error);
    res.status(500).json({ 
      error: "Error en la operación", 
      details: error.message 
    });
  }
};
const getActiveArea = async (req, res) => {
try {
    const area = await areaModel.find({ state: 1 });
    if (!area.length) {
      return res.status(404).json({ message: "No hay areas activas" });
    }
    res.json(area)
} catch (error) {
    res.status(400).json({error:"error al cargar areas"})
    console.error(error)
}
};
const getInactiveArea = async (req, res) => {
    try{
const area = await areaModel.find({ state:2 });
    if(!area.length){
        res.status(400).json({error: "No hay areas inactivas"})
    }
    res.json(area)
    }catch(error){
        res.status(400).json({error: " Error en la operacón"})
        console.error(error)
    }
    
};

export {
    postArea, getArea, putArea, getActiveArea,getInactiveArea
}