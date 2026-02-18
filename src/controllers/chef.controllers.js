import { asyncHandler } from "../utils/asyncHandler.js";
import { Account } from "../models/account.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { Dish } from "../models/dish.model.js";
import { Booking } from "../models/booking.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// ─── Helper: Generate Tokens ───────────────────────────────────
const generateAccessAndRefreshToken = async (accountId) => {
    try {
        const account = await Account.findById(accountId);
        const accessToken = account.generateAccessToken();
        const refreshToken = account.generateRefreshToken();

        account.refreshToken = refreshToken;
        await account.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating tokens"
        );
    }
};

// ─── Register Chef ─────────────────────────────────────────────
const registerChef = asyncHandler(async (req, res) => {
    const {
        fullName,
        email,
        password,
        phone,
        bio,
        specialization,
        experience,
        pricePerHour,
        serviceLocations,
    } = req.body;

    // Validate required fields
    if (
        [fullName, email, password, phone].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All required fields must be provided");
    }

    if (!experience || !pricePerHour) {
        throw new ApiError(400, "Experience and price per hour are required");
    }

    // Check if account exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
        throw new ApiError(409, "Account with this email already exists");
    }

    // Upload avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar");
    }

    // Upload cover image (optional)
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    // Upload certificates (optional)
    const certImages = [];
    if (req.files?.certificates) {
        for (const cert of req.files.certificates) {
            const uploaded = await uploadOnCloudinary(cert.path);
            if (uploaded) certImages.push(uploaded.url);
        }
    }

    // Parse JSON fields from form data
    const parsedSpecialization =
        typeof specialization === "string"
            ? JSON.parse(specialization)
            : specialization || [];
    const parsedLocations =
        typeof serviceLocations === "string"
            ? JSON.parse(serviceLocations)
            : serviceLocations || [];

    // Validate serviceLocations format
    if (parsedLocations.length > 0) {
        const invalidLocation = parsedLocations.find(loc => !loc.city);
        if (invalidLocation) {
            throw new ApiError(400, "Each service location must have a 'city' field");
        }
    }

    console.log("Parsed data:", {
        specialization: parsedSpecialization,
        locations: parsedLocations,
        experience: Number(experience),
        pricePerHour: Number(pricePerHour)
    });

    // Create account
    const account = await Account.create({
        email,
        password,
        role: "chef",
    });

    console.log("Account created with ID:", account._id);

    // Create chef profile
    try {
        const chefProfile = await ChefProfile.create({
            account: account._id,
            fullName,
            phone,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            bio: bio || "",
            specialization: parsedSpecialization,
            experience: Number(experience),
            pricePerHour: Number(pricePerHour),
            serviceLocations: parsedLocations,
            certification: certImages.map((url) => ({ document: url })),
        });

        console.log("ChefProfile created with ID:", chefProfile._id);

        // Link profile to account
        account.chefProfile = chefProfile._id;
        await account.save({ validateBeforeSave: false });

        console.log("Account updated with chefProfile reference");

        // Generate tokens
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(account._id);

        const createdChef = await Account.findById(account._id)
            .select("-password -refreshToken")
            .populate("chefProfile");

        const options = { httpOnly: true, secure: true };

        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    201,
                    { chef: createdChef, accessToken, refreshToken },
                    "Chef registered successfully"
                )
            );
    } catch (profileError) {
        // If ChefProfile creation fails, delete the created account
        console.error("ChefProfile creation failed:", profileError.message);
        await Account.findByIdAndDelete(account._id);
        throw new ApiError(
            500,
            `Failed to create chef profile: ${profileError.message}`
        );
    }
});

// ─── Login Chef ────────────────────────────────────────────────
const loginChef = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const account = await Account.findOne({ email, role: "chef" });
    if (!account) {
        throw new ApiError(404, "Chef account not found");
    }

    const isPasswordValid = await account.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(account._id);

    const loggedInChef = await Account.findById(account._id)
        .select("-password -refreshToken")
        .populate("chefProfile");

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { chef: loggedInChef, accessToken, refreshToken },
                "Chef logged in successfully"
            )
        );
});

// ─── Logout Chef ───────────────────────────────────────────────
const logoutChef = asyncHandler(async (req, res) => {
    await Account.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Chef logged out successfully"));
});

// ─── Get Chef Profile ──────────────────────────────────────────
const getChefProfile = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id)
        .select("-password -refreshToken")
        .populate({
            path: "chefProfile",
            populate: {
                path: "dishes",
                model: "Dish",
            },
        });

    if (!account) {
        throw new ApiError(404, "Chef not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, account, "Chef profile fetched successfully")
        );
});

// ─── Update Chef Profile ───────────────────────────────────────
const updateChefProfile = asyncHandler(async (req, res) => {
    const {
        fullName,
        phone,
        bio,
        specialization,
        experience,
        pricePerHour,
        minimumBookingHours,
        serviceLocations,
        workingHours,
        bankDetails,
        socialLinks,
    } = req.body;

    const account = await Account.findById(req.user._id);
    if (!account?.chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (phone) updateFields.phone = phone;
    if (bio !== undefined) updateFields.bio = bio;
    if (specialization) updateFields.specialization = specialization;
    if (experience) updateFields.experience = experience;
    if (pricePerHour) updateFields.pricePerHour = pricePerHour;
    if (minimumBookingHours)
        updateFields.minimumBookingHours = minimumBookingHours;
    if (serviceLocations) updateFields.serviceLocations = serviceLocations;
    if (workingHours) updateFields.workingHours = workingHours;
    if (bankDetails) updateFields.bankDetails = bankDetails;
    if (socialLinks) updateFields.socialLinks = socialLinks;

    const updatedProfile = await ChefProfile.findByIdAndUpdate(
        account.chefProfile,
        { $set: updateFields },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedProfile,
                "Chef profile updated successfully"
            )
        );
});

// ─── Add Dish ──────────────────────────────────────────────────
const addDish = asyncHandler(async (req, res) => {
    const {
        name,
        description,
        category,
        cuisine,
        preparationTime,
        cookingTime,
        servings,
        price,
        ingredients,
        dietaryInfo,
        tags,
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !cuisine || !price) {
        throw new ApiError(400, "Required dish fields are missing");
    }

    if (!preparationTime || !cookingTime) {
        throw new ApiError(
            400,
            "Preparation time and cooking time are required"
        );
    }

    // Get chef profile
    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);
    if (!chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    // Upload dish images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            const uploaded = await uploadOnCloudinary(file.path);
            if (uploaded) imageUrls.push(uploaded.url);
        }
    }

    // Parse JSON fields from form data
    const parsedIngredients =
        typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients || [];
    const parsedDietaryInfo =
        typeof dietaryInfo === "string" ? JSON.parse(dietaryInfo) : dietaryInfo || {};
    const parsedTags =
        typeof tags === "string" ? JSON.parse(tags) : tags || [];

    // Create dish
    const dish = await Dish.create({
        chef: chefProfile._id,
        name,
        description,
        category,
        cuisine,
        images: imageUrls,
        preparationTime: Number(preparationTime),
        cookingTime: Number(cookingTime),
        servings: Number(servings) || 1,
        price: Number(price),
        ingredients: parsedIngredients,
        dietaryInfo: parsedDietaryInfo,
        tags: parsedTags,
    });

    // Add dish to chef's dish list
    chefProfile.dishes.push(dish._id);
    await chefProfile.save();

    return res
        .status(201)
        .json(new ApiResponse(201, dish, "Dish added successfully"));
});

// ─── Update Dish ───────────────────────────────────────────────
const updateDish = asyncHandler(async (req, res) => {
    const { dishId } = req.params;

    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    // Verify dish belongs to this chef
    const dish = await Dish.findById(dishId);
    if (!dish) {
        throw new ApiError(404, "Dish not found");
    }
    if (dish.chef.toString() !== chefProfile._id.toString()) {
        throw new ApiError(403, "You can only update your own dishes");
    }

    const allowedUpdates = [
        "name", "description", "category", "cuisine",
        "preparationTime", "cookingTime", "servings",
        "price", "ingredients", "dietaryInfo", "tags",
        "isAvailable", "videoUrl",
    ];

    const updateFields = {};
    for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
            updateFields[field] = req.body[field];
        }
    }

    const updatedDish = await Dish.findByIdAndUpdate(
        dishId,
        { $set: updateFields },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedDish, "Dish updated successfully"));
});

// ─── Delete Dish ───────────────────────────────────────────────
const deleteDish = asyncHandler(async (req, res) => {
    const { dishId } = req.params;

    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    const dish = await Dish.findById(dishId);
    if (!dish) {
        throw new ApiError(404, "Dish not found");
    }
    if (dish.chef.toString() !== chefProfile._id.toString()) {
        throw new ApiError(403, "You can only delete your own dishes");
    }

    await Dish.findByIdAndDelete(dishId);

    // Remove from chef's dishes array
    await ChefProfile.findByIdAndUpdate(chefProfile._id, {
        $pull: { dishes: dishId },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Dish deleted successfully"));
});

// ─── Get Chef's Own Dishes ─────────────────────────────────────
const getChefDishes = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    if (!chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    const { category, isAvailable } = req.query;

    const query = { chef: chefProfile._id };
    if (category) query.category = category;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

    const dishes = await Dish.find(query).sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, dishes, "Dishes fetched successfully"));
});

// ─── Get Chef's Bookings ───────────────────────────────────────
const getChefBookings = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    if (!chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    const { status, page = 1, limit = 10 } = req.query;

    const query = { chef: chefProfile._id };
    if (status) query.bookingStatus = status;

    const bookings = await Booking.find(query)
        .populate({
            path: "user",
            select: "fullName avatar phone",
        })
        .populate({
            path: "dishes.dish",
            select: "name images price",
        })
        .sort({ bookingDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

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
const updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(
            400,
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
    }

    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }
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
        booking.cancelledBy = "chef";
        booking.cancelledAt = new Date();
    }

    await booking.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, booking, "Booking status updated successfully")
        );
});

// ─── Get Chef Stats (Dashboard) ────────────────────────────────
const getChefStats = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    if (!chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    const totalDishes = await Dish.countDocuments({ chef: chefProfile._id });
    const pendingBookings = await Booking.countDocuments({
        chef: chefProfile._id,
        bookingStatus: "pending",
    });
    const activeBookings = await Booking.countDocuments({
        chef: chefProfile._id,
        bookingStatus: { $in: ["confirmed", "in-progress"] },
    });

    // Calculate total earnings
    const earnings = await Booking.aggregate([
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
                totalOrders: { $sum: 1 },
            },
        },
    ]);

    const stats = {
        totalDishes,
        totalBookings: chefProfile.totalBookings,
        completedBookings: chefProfile.completedBookings,
        pendingBookings,
        activeBookings,
        averageRating: chefProfile.averageRating,
        totalReviews: chefProfile.totalReviews,
        totalEarnings: earnings[0]?.totalEarnings || 0,
        isAvailable: chefProfile.isAvailable,
        accountStatus: chefProfile.accountStatus,
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, stats, "Chef stats fetched successfully")
        );
});

// ─── Toggle Availability ───────────────────────────────────────
const toggleAvailability = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id);
    const chefProfile = await ChefProfile.findById(account.chefProfile);

    if (!chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    chefProfile.isAvailable = !chefProfile.isAvailable;
    await chefProfile.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isAvailable: chefProfile.isAvailable },
                `Chef is now ${chefProfile.isAvailable ? "available" : "unavailable"}`
            )
        );
});

// ─── Debug: Check Chef Data (Development Only) ─────────────────
const debugChefData = asyncHandler(async (req, res) => {
    const { email } = req.query;

    if (!email) {
        throw new ApiError(400, "Email query parameter required");
    }

    // Find account
    const account = await Account.findOne({ email, role: "chef" })
        .select("-password -refreshToken");

    if (!account) {
        return res.status(404).json(
            new ApiResponse(404, null, "Chef account not found")
        );
    }

    // Find chef profile
    const chefProfile = await ChefProfile.findOne({ account: account._id });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                account: account,
                chefProfile: chefProfile,
                linked: account.chefProfile?.toString() === chefProfile?._id?.toString(),
                message: chefProfile 
                    ? "Both Account and ChefProfile exist" 
                    : "Account exists but ChefProfile is MISSING!"
            },
            "Debug data fetched"
        )
    );
});

export {
    registerChef,
    loginChef,
    logoutChef,
    getChefProfile,
    updateChefProfile,
    addDish,
    updateDish,
    deleteDish,
    getChefDishes,
    getChefBookings,
    updateBookingStatus,
    getChefStats,
    toggleAvailability,
    debugChefData,
};
