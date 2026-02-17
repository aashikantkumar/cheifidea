import { asyncHandler } from "../utils/asyncHandler.js";
import { Account } from "../models/account.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { Dish } from "../models/dish.model.js";
import { Booking } from "../models/booking.model.js";
import { Review } from "../models/review.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ─── Create Booking ────────────────────────────────────────────
const createBooking = asyncHandler(async (req, res) => {
    const {
        chefId,
        dishes,          // [{ dishId, quantity }]
        bookingDate,
        bookingTime,
        eventType,
        guestCount,
        serviceLocation, // { address, city, state, zipCode }
        specialInstructions,
        dietaryRestrictions,
        paymentMethod,
    } = req.body;

    // Validate required fields
    if (!chefId || !dishes || !bookingDate || !bookingTime || !guestCount || !serviceLocation) {
        throw new ApiError(400, "Missing required booking fields");
    }

    // Get user profile
    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(account.userProfile);
    if (!userProfile) {
        throw new ApiError(404, "User profile not found");
    }

    // Get chef profile
    const chefProfile = await ChefProfile.findById(chefId);
    if (!chefProfile) {
        throw new ApiError(404, "Chef not found");
    }
    if (!chefProfile.isAvailable) {
        throw new ApiError(400, "Chef is currently not available");
    }

    // Validate and calculate dish prices
    let dishesTotal = 0;
    const bookingDishes = [];

    for (const item of dishes) {
        const dish = await Dish.findById(item.dishId);
        if (!dish) {
            throw new ApiError(404, `Dish not found: ${item.dishId}`);
        }
        if (dish.chef.toString() !== chefId) {
            throw new ApiError(400, `Dish ${dish.name} does not belong to this chef`);
        }
        if (!dish.isAvailable) {
            throw new ApiError(400, `Dish ${dish.name} is not available`);
        }

        const quantity = Number(item.quantity) || 1;
        const itemTotal = dish.price * quantity;
        dishesTotal += itemTotal;

        bookingDishes.push({
            dish: dish._id,
            quantity,
            price: dish.price,
        });
    }

    // Calculate fees
    const chefFee = chefProfile.pricePerHour * (chefProfile.minimumBookingHours || 2);
    const platformFee = Math.round(dishesTotal * 0.05); // 5% platform fee
    const taxes = Math.round((dishesTotal + chefFee) * 0.18); // 18% GST
    const totalAmount = dishesTotal + chefFee + platformFee + taxes;

    // Create booking
    const booking = await Booking.create({
        user: userProfile._id,
        chef: chefProfile._id,
        dishes: bookingDishes,
        bookingDate: new Date(bookingDate),
        bookingTime,
        eventType: eventType || "Casual Dinner",
        guestCount: Number(guestCount),
        serviceLocation,
        dishesTotal,
        chefFee,
        platformFee,
        taxes,
        totalAmount,
        paymentMethod: paymentMethod || "cash",
        specialInstructions: specialInstructions || "",
        dietaryRestrictions: dietaryRestrictions || [],
    });

    // Add to user's booking history
    userProfile.bookingHistory.push(booking._id);
    await userProfile.save();

    // Update chef's total bookings
    chefProfile.totalBookings += 1;
    await chefProfile.save();

    // Update dish order counts
    for (const item of bookingDishes) {
        await Dish.findByIdAndUpdate(item.dish, {
            $inc: { ordersCount: item.quantity },
        });
    }

    // Populate and return
    const populatedBooking = await Booking.findById(booking._id)
        .populate({
            path: "chef",
            select: "fullName avatar phone",
        })
        .populate({
            path: "dishes.dish",
            select: "name images price",
        });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                populatedBooking,
                "Booking created successfully"
            )
        );
});

// ─── Get Booking By ID ─────────────────────────────────────────
const getBookingById = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
        .populate({
            path: "user",
            select: "fullName avatar phone address",
        })
        .populate({
            path: "chef",
            select: "fullName avatar phone specialization pricePerHour",
        })
        .populate({
            path: "dishes.dish",
            select: "name description images price category cuisine",
        });

    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    // Verify the requester is either the user or the chef of this booking
    const account = await Account.findById(req.user._id);
    let isAuthorized = false;

    if (account.role === "user" && account.userProfile) {
        const userProfile = await UserProfile.findById(account.userProfile);
        isAuthorized = booking.user._id.toString() === userProfile._id.toString();
    } else if (account.role === "chef" && account.chefProfile) {
        const chefProfile = await ChefProfile.findById(account.chefProfile);
        isAuthorized = booking.chef._id.toString() === chefProfile._id.toString();
    }

    if (!isAuthorized) {
        throw new ApiError(403, "You are not authorized to view this booking");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, booking, "Booking fetched successfully")
        );
});

// ─── Cancel Booking ────────────────────────────────────────────
const cancelBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    // Check if booking can be cancelled
    if (["completed", "cancelled"].includes(booking.bookingStatus)) {
        throw new ApiError(
            400,
            `Booking cannot be cancelled — it is already ${booking.bookingStatus}`
        );
    }

    // Verify the requester is the user who made the booking
    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(account.userProfile);

    if (!userProfile || booking.user.toString() !== userProfile._id.toString()) {
        throw new ApiError(403, "You can only cancel your own bookings");
    }

    booking.bookingStatus = "cancelled";
    booking.cancellationReason = reason || "Cancelled by user";
    booking.cancelledBy = "user";
    booking.cancelledAt = new Date();
    await booking.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, booking, "Booking cancelled successfully")
        );
});

// ─── Add Review ────────────────────────────────────────────────
const addReview = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { rating, foodQuality, professionalism, punctuality, comment } =
        req.body;

    if (!rating || rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5");
    }

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }
    if (booking.bookingStatus !== "completed") {
        throw new ApiError(
            400,
            "You can only review completed bookings"
        );
    }

    // Verify the requester is the user who made the booking
    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(account.userProfile);

    if (!userProfile || booking.user.toString() !== userProfile._id.toString()) {
        throw new ApiError(403, "You can only review your own bookings");
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
        throw new ApiError(400, "You have already reviewed this booking");
    }

    // Create review
    const review = await Review.create({
        booking: bookingId,
        user: userProfile._id,
        chef: booking.chef,
        rating: Number(rating),
        foodQuality: foodQuality ? Number(foodQuality) : undefined,
        professionalism: professionalism ? Number(professionalism) : undefined,
        punctuality: punctuality ? Number(punctuality) : undefined,
        comment: comment || "",
    });

    // Update chef's average rating
    const chefProfile = await ChefProfile.findById(booking.chef);
    const allReviews = await Review.find({ chef: booking.chef });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);

    chefProfile.averageRating = parseFloat(
        (totalRating / allReviews.length).toFixed(1)
    );
    chefProfile.totalReviews = allReviews.length;
    await chefProfile.save();

    return res
        .status(201)
        .json(new ApiResponse(201, review, "Review added successfully"));
});

export { createBooking, getBookingById, cancelBooking, addReview };
