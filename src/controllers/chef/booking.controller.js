import { asyncHandler } from "../../utils/asyncHandler.js";
import { Booking } from "../../models/booking.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { findChefProfile } from "../../services/chef.service.js";

const VALID_BOOKING_STATUSES = ["confirmed", "in-progress", "completed", "cancelled"];

// ─── Get Chef's Bookings ───────────────────────────────────────
export const getChefBookings = asyncHandler(async (req, res) => {
    const { chefProfile } = await findChefProfile(req.user._id);
    const { status, page = 1, limit = 10 } = req.query;

    const query = { chef: chefProfile._id };
    if (status) query.bookingStatus = status;

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate({ path: "user",       select: "fullName avatar phone" })
            .populate({ path: "dishes.dish", select: "name images price" })
            .sort({ bookingDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit)),
        Booking.countDocuments(query),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                bookings,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                },
            },
            "Bookings fetched successfully"
        )
    );
});

// ─── Update Booking Status ─────────────────────────────────────
export const updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!VALID_BOOKING_STATUSES.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${VALID_BOOKING_STATUSES.join(", ")}`);
    }

    const { chefProfile } = await findChefProfile(req.user._id);

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.chef.toString() !== chefProfile._id.toString()) {
        throw new ApiError(403, "You can only update your own bookings");
    }

    booking.bookingStatus = status;

    if (status === "completed") {
        booking.completedAt = new Date();
        chefProfile.completedBookings += 1;
        await chefProfile.save();
    }

    if (status === "cancelled") {
        booking.cancelledBy  = "chef";
        booking.cancelledAt  = new Date();
    }

    await booking.save();

    return res
        .status(200)
        .json(new ApiResponse(200, booking, "Booking status updated successfully"));
});
