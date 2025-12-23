import { check } from "express-validator";

export const userValidation = [
    check("data.names", "El nombre es obligatorio")
        .notEmpty()
        .isLength({ max: 70 })
        .withMessage("El nombre no debe exceder los 70 caracteres"),

    check("data.identification", "La identificación es obligatoria")
        .notEmpty()
        .isLength({ min: 5, max: 20 })
        .withMessage("La identificación debe tener entre 5 y 20 caracteres"),

    check("data.gmail", "El correo electrónico es obligatorio")
        .notEmpty()
        .isEmail()
        .withMessage("Debe proporcionar un correo electrónico válido"),

    check("data.phone")
        .optional()
        .isNumeric()
        .withMessage("El número de teléfono debe contener solo dígitos")
        .isLength({ min: 7, max: 15 })
        .withMessage("El número de teléfono debe tener entre 7 y 15 dígitos"),

    check("data.tribute_id")
        .optional()
        .isString()
        .isLength({ max: 50 })
        .withMessage("El ID del tributo no debe exceder los 50 caracteres"),

    check("data.password", "La contraseña es obligatoria")
        .notEmpty()
        .isLength({ min: 6 })
        .withMessage("La contraseña debe tener al menos 6 caracteres"),

    check("data.rol")
        .optional()
        .isIn([1, 2, 3])
        .withMessage("El rol debe ser 1 (Super administrador), 2 (Administrador) o 3 (Trabajador)"),

    check("data.state")
        .optional()
        .isIn([1, 2])
        .withMessage("El estado debe ser 1 (activo) o 2 (inactivo)"),

    check("data.date")
        .optional()
        .isISO8601()
        .withMessage("La fecha debe tener un formato válido (YYYY-MM-DD)"),

    check("data.areaId")
        .optional()
        .isMongoId()
        .withMessage("El ID del área debe ser un ObjectId válido de MongoDB"),
];
