import { asyncHandler } from "../../utils/asyncHandler.js";
import { Account } from "../../models/account.model.js";
import { ChefProfile } from "../../models/chefProfile.model.js";
import { Dish } from "../../models/dish.model.js";
import { Booking } from "../../models/booking.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { findChefProfile } from "../../services/chef.service.js";

// ─── Get Chef Stats (Dashboard) ────────────────────────────────
export const getChefStats = asyncHandler(async (req, res) => {
    const { chefProfile } = await findChefProfile(req.user._id);

    const [totalDishes, pendingBookings, activeBookings, earnings] = await Promise.all([
        Dish.countDocuments({ chef: chefProfile._id }),
        Booking.countDocuments({ chef: chefProfile._id, bookingStatus: "pending" }),
        Booking.countDocuments({ chef: chefProfile._id, bookingStatus: { $in: ["confirmed", "in-progress"] } }),
        Booking.aggregate([
            {
                $match: {
                    chef: chefProfile._id,
                    bookingStatus: "completed",
                    paymentStatus: "paid",
                },
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: "$chefFee" },
                    totalOrders:   { $sum: 1 },
                },
            },
        ]),
    ]);

    const stats = {
        totalDishes,
        totalBookings:      chefProfile.totalBookings,
        completedBookings:  chefProfile.completedBookings,
        pendingBookings,
        activeBookings,
        averageRating:      chefProfile.averageRating,
        totalReviews:       chefProfile.totalReviews,
        totalEarnings:      earnings[0]?.totalEarnings || 0,
        isAvailable:        chefProfile.isAvailable,
        accountStatus:      chefProfile.accountStatus,
    };

    return res.status(200).json(new ApiResponse(200, stats, "Chef stats fetched successfully"));
});

// ─── Toggle Availability ───────────────────────────────────────
export const toggleAvailability = asyncHandler(async (req, res) => {
    const { chefProfile } = await findChefProfile(req.user._id);

    chefProfile.isAvailable = !chefProfile.isAvailable;
    await chefProfile.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { isAvailable: chefProfile.isAvailable },
            `Chef is now ${chefProfile.isAvailable ? "available" : "unavailable"}`
        )
    );
});

// ─── Debug: Check Chef Data (Development Only) ─────────────────
export const debugChefData = asyncHandler(async (req, res) => {
    const { email } = req.query;
    if (!email) throw new ApiError(400, "Email query parameter required");

    const account     = await Account.findOne({ email, role: "chef" }).select("-password -refreshToken");
    if (!account) {
        return res.status(404).json(new ApiResponse(404, null, "Chef account not found"));
    }

    const chefProfile = await ChefProfile.findOne({ account: account._id });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                account,
                chefProfile,
                linked:  account.chefProfile?.toString() === chefProfile?._id?.toString(),
                message: chefProfile
                    ? "Both Account and ChefProfile exist"
                    : "Account exists but ChefProfile is MISSING!",
            },
            "Debug data fetched"
        )
    );
});
