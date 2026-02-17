import { Router } from "express";
import {
    getAllChefs,
    getChefById,
    searchChefs,
    getChefDishes,
    getDishById,
    searchDishes,
} from "../controllers/public.controllers.js";

const router = Router();

// ─── Browse Chefs ──────────────────────────────────────────────
router.route("/chefs").get(getAllChefs);
router.route("/chefs/search").get(searchChefs);
router.route("/chefs/:chefId").get(getChefById);
router.route("/chefs/:chefId/dishes").get(getChefDishes);

// ─── Browse Dishes ─────────────────────────────────────────────
router.route("/dishes").get(searchDishes);
router.route("/dishes/:dishId").get(getDishById);

export default router;
