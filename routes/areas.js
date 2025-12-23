import express from "express";
import { getActiveArea, getArea, getInactiveArea, postArea, putArea } from "../controllers/areas.js";

const router = express.Router();

router.post("/create", postArea);
router.get("/seeAreas", getArea);
router.put("/:id", putArea);
router.get("/active", getActiveArea);
router.get("/inactive", getInactiveArea)

export default router;
