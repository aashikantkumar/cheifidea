import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, verifyUser } from "../middlewares/auth.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    getUserBookings,
    getFavoriteChefs,
    addFavoriteChef,
    removeFavoriteChef,
} from "../controllers/user.controllers.js";

const router = Router();

// ─── Public Routes ─────────────────────────────────────────────
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// ─── Protected Routes ──────────────────────────────────────────
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/profile").get(verifyJWT, getUserProfile);
router.route("/profile/update").patch(verifyJWT, updateUserProfile);
router
    .route("/profile/avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/bookings").get(verifyJWT, getUserBookings);
router.route("/favorites").get(verifyJWT, getFavoriteChefs);
router.route("/favorites/:chefId").post(verifyJWT, addFavoriteChef);
router.route("/favorites/:chefId").delete(verifyJWT, removeFavoriteChef);

export default router;
