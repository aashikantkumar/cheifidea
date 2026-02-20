import { asyncHandler } from "../utils/asyncHandler.js";
import { Account } from "../models/account.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { Dish } from "../models/dish.model.js";
import { Booking } from "../models/booking.model.js";
import { Review } from "../models/review.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { withTransaction } from "../utils/transaction.js";

const applySession = (query, session) => {
    if (session) {
        query.session(session);
    }
    return query;
};

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed", "in-progress"]);

// ─── Create Booking ────────────────────────────────────────────
const createBooking = asyncHandler(async (req, res) => {
    const {
        chefId,
        dishes,
        bookingDate,
        bookingTime,
        eventType,
        guestCount,
        serviceLocation,
        specialInstructions,
        dietaryRestrictions,
        paymentMethod,
    } = req.body;

    const parsedBookingDate = new Date(bookingDate);
    if (Number.isNaN(parsedBookingDate.getTime())) {
        throw new ApiError(400, "Invalid bookingDate format");
    }

    const bookingId = await withTransaction(async (session) => {
        const account = await applySession(Account.findById(req.user._id), session);
        const userProfile = await applySession(
            UserProfile.findById(account?.userProfile),
            session
        );

        if (!userProfile) {
            throw new ApiError(404, "User profile not found");
        }

        const chefProfile = await applySession(ChefProfile.findById(chefId), session);
        if (!chefProfile) {
            throw new ApiError(404, "Chef not found");
        }
        if (!chefProfile.isApproved || chefProfile.accountStatus !== "active") {
            throw new ApiError(400, "Chef account is not active");
        }
        if (!chefProfile.isAvailable) {
            throw new ApiError(400, "Chef is currently not available");
        }

        const bookingDishes = [];
        let dishesTotal = 0;

        for (const item of dishes) {
            const dish = await applySession(Dish.findById(item.dishId), session);

            if (!dish) {
                throw new ApiError(404, `Dish not found: ${item.dishId}`);
            }
            if (dish.chef.toString() !== chefId) {
                throw new ApiError(
                    400,
                    `Dish ${dish.name} does not belong to this chef`
                );
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

        const chefFee =
            chefProfile.pricePerHour * (chefProfile.minimumBookingHours || 2);
        const platformFee = Math.round(dishesTotal * 0.05);
        const taxes = Math.round((dishesTotal + chefFee) * 0.18);
        const totalAmount = dishesTotal + chefFee + platformFee + taxes;

        const booking = session
            ? (
                  await Booking.create(
                      [
                          {
                              user: userProfile._id,
                              chef: chefProfile._id,
                              dishes: bookingDishes,
                              bookingDate: parsedBookingDate,
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
                          },
                      ],
                      { session }
                  )
              )[0]
            : await Booking.create({
                  user: userProfile._id,
                  chef: chefProfile._id,
                  dishes: bookingDishes,
                  bookingDate: parsedBookingDate,
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

        await UserProfile.findByIdAndUpdate(
            userProfile._id,
            {
                $addToSet: { bookingHistory: booking._id },
            },
            session ? { session } : {}
        );

        await ChefProfile.findByIdAndUpdate(
            chefProfile._id,
            {
                $inc: { totalBookings: 1 },
            },
            session ? { session } : {}
        );

        const dishUpdateOperations = bookingDishes.map((item) => ({
            updateOne: {
                filter: { _id: item.dish },
                update: { $inc: { ordersCount: item.quantity } },
            },
        }));

        await Dish.bulkWrite(dishUpdateOperations, session ? { session } : {});

        return booking._id;
    });

    const populatedBooking = await Booking.findById(bookingId)
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

    const account = await Account.findById(req.user._id);
    const accountUserId = account?.userProfile?.toString();
    const accountChefId = account?.chefProfile?.toString();

    const isAuthorized =
        (account.role === "user" &&
            booking.user?._id?.toString() === accountUserId) ||
        (account.role === "chef" &&
            booking.chef?._id?.toString() === accountChefId);

    if (!isAuthorized) {
        throw new ApiError(403, "You are not authorized to view this booking");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, booking, "Booking fetched successfully"));
});

// ─── Cancel Booking ────────────────────────────────────────────
const cancelBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    if (!CANCELLABLE_STATUSES.has(booking.bookingStatus)) {
        throw new ApiError(
            400,
            `Booking cannot be cancelled from status ${booking.bookingStatus}`
        );
    }

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
        .json(new ApiResponse(200, booking, "Booking cancelled successfully"));
});

// ─── Add Review ────────────────────────────────────────────────
const addReview = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { rating, foodQuality, professionalism, punctuality, comment } =
        req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }
    if (booking.bookingStatus !== "completed") {
        throw new ApiError(400, "You can only review completed bookings");
    }

    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(account.userProfile);

    if (!userProfile || booking.user.toString() !== userProfile._id.toString()) {
        throw new ApiError(403, "You can only review your own bookings");
    }

    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
        throw new ApiError(400, "You have already reviewed this booking");
    }

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

    const [chefReviewStats] = await Review.aggregate([
        {
            $match: { chef: booking.chef },
        },
        {
            $group: {
                _id: "$chef",
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
            },
        },
    ]);

    await ChefProfile.findByIdAndUpdate(booking.chef, {
        $set: {
            averageRating: Number((chefReviewStats?.averageRating || 0).toFixed(1)),
            totalReviews: chefReviewStats?.totalReviews || 0,
        },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, review, "Review added successfully"));
});

export { createBooking, getBookingById, cancelBooking, addReview };
