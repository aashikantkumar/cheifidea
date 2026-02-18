// ─── Barrel Export ─────────────────────────────────────────────
// Single entry point for all chef controllers

export { registerChef, loginChef, logoutChef } from "./auth.controller.js";
export { getChefProfile, updateChefProfile }   from "./profile.controller.js";
export { addDish, updateDish, deleteDish, getChefDishes } from "./dish.controller.js";
export { getChefBookings, updateBookingStatus } from "./booking.controller.js";
export { getChefStats, toggleAvailability, debugChefData } from "./dashboard.controller.js";
