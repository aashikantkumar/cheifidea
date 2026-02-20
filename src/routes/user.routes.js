import { Router } from "express";
import { uploadUserAvatar } from "../middlewares/multer.middleware.js";
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
router.route("/register").post(uploadUserAvatar, registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// ─── Protected Routes ──────────────────────────────────────────
router.route("/logout").post(verifyJWT, verifyUser, logoutUser);
router.route("/change-password").post(verifyJWT, verifyUser, changePassword);
router.route("/profile").get(verifyJWT, verifyUser, getUserProfile);
router.route("/profile/update").patch(verifyJWT, verifyUser, updateUserProfile);
router
    .route("/profile/avatar")
    .patch(verifyJWT, verifyUser, uploadUserAvatar, updateUserAvatar);
router.route("/bookings").get(verifyJWT, verifyUser, getUserBookings);
router.route("/favorites").get(verifyJWT, verifyUser, getFavoriteChefs);
router.route("/favorites/:chefId").post(verifyJWT, verifyUser, addFavoriteChef);
router.route("/favorites/:chefId").delete(verifyJWT, verifyUser, removeFavoriteChef);

export default router;
