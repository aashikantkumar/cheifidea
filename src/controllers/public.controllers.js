import { asyncHandler } from "../utils/asyncHandler.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { Dish } from "../models/dish.model.js";
import { Review } from "../models/review.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ─── Get All Chefs (Browse) ────────────────────────────────────
const getAllChefs = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12,
        sortBy = "averageRating",
        order = "desc",
        city,
        specialization,
        minPrice,
        maxPrice,
        minRating,
    } = req.query;

    const query = {
        isApproved: true,
        isAvailable: true,
        accountStatus: "active",
    };

    if (city) {
        query["serviceLocations.city"] = { $regex: city, $options: "i" };
    }
    if (specialization) {
        query.specialization = { $in: specialization.split(",") };
    }
    if (minPrice || maxPrice) {
        query.pricePerHour = {};
        if (minPrice) query.pricePerHour.$gte = Number(minPrice);
        if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }
    if (minRating) {
        query.averageRating = { $gte: Number(minRating) };
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === "asc" ? 1 : -1;

    const chefs = await ChefProfile.find(query)
        .select(
            "fullName avatar coverImage specialization experience pricePerHour averageRating totalReviews totalBookings serviceLocations bio isAvailable"
        )
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await ChefProfile.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                chefs,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                },
            },
            "Chefs fetched successfully"
        )
    );
});

// ─── Get Chef By ID ────────────────────────────────────────────
const getChefById = asyncHandler(async (req, res) => {
    const { chefId } = req.params;

    const chef = await ChefProfile.findById(chefId).populate({
        path: "dishes",
        match: { isAvailable: true },
        select: "name description category cuisine images preparationTime cookingTime price servings dietaryInfo tags rating ordersCount",
    });

    if (!chef) {
        throw new ApiError(404, "Chef not found");
    }

    // Get recent reviews for this chef
    const reviews = await Review.find({ chef: chefId })
        .populate({
            path: "user",
            select: "fullName avatar",
        })
        .sort({ createdAt: -1 })
        .limit(10);

    return res.status(200).json(
        new ApiResponse(
            200,
            { chef, reviews },
            "Chef details fetched successfully"
        )
    );
});

// ─── Search Chefs ──────────────────────────────────────────────
const searchChefs = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q) {
        throw new ApiError(400, "Search query is required");
    }

    const query = {
        isApproved: true,
        isAvailable: true,
        accountStatus: "active",
        $or: [
            { fullName: { $regex: q, $options: "i" } },
            { specialization: { $regex: q, $options: "i" } },
            { bio: { $regex: q, $options: "i" } },
            { "serviceLocations.city": { $regex: q, $options: "i" } },
        ],
    };

    const chefs = await ChefProfile.find(query)
        .select(
            "fullName avatar specialization pricePerHour averageRating totalReviews serviceLocations bio"
        )
        .sort({ averageRating: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await ChefProfile.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                chefs,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                },
            },
            "Search results fetched"
        )
    );
});

// ─── Get Chef's Dishes (Public) ────────────────────────────────
const getChefDishes = asyncHandler(async (req, res) => {
    const { chefId } = req.params;
    const { category, cuisine, vegetarian, page = 1, limit = 20 } = req.query;

    const chef = await ChefProfile.findById(chefId);
    if (!chef) {
        throw new ApiError(404, "Chef not found");
    }

    const query = { chef: chefId, isAvailable: true };
    if (category) query.category = category;
    if (cuisine) query.cuisine = cuisine;
    if (vegetarian === "true") query["dietaryInfo.isVegetarian"] = true;

    const dishes = await Dish.find(query)
        .sort({ ordersCount: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Dish.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                dishes,
                chef: {
                    fullName: chef.fullName,
                    avatar: chef.avatar,
                    averageRating: chef.averageRating,
                },
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                },
            },
            "Chef dishes fetched successfully"
        )
    );
});

// ─── Get Dish By ID ────────────────────────────────────────────
const getDishById = asyncHandler(async (req, res) => {
    const { dishId } = req.params;

    const dish = await Dish.findById(dishId).populate({
        path: "chef",
        select: "fullName avatar averageRating totalReviews pricePerHour phone serviceLocations",
    });

    if (!dish) {
        throw new ApiError(404, "Dish not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, dish, "Dish details fetched successfully")
        );
});

// ─── Search Dishes ─────────────────────────────────────────────
const searchDishes = asyncHandler(async (req, res) => {
    const {
        q,
        category,
        cuisine,
        minPrice,
        maxPrice,
        vegetarian,
        vegan,
        spiceLevel,
        page = 1,
        limit = 20,
    } = req.query;

    const query = { isAvailable: true };

    if (q) {
        query.$or = [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { tags: { $regex: q, $options: "i" } },
        ];
    }
    if (category) query.category = category;
    if (cuisine) query.cuisine = cuisine;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (vegetarian === "true") query["dietaryInfo.isVegetarian"] = true;
    if (vegan === "true") query["dietaryInfo.isVegan"] = true;
    if (spiceLevel) query["dietaryInfo.spiceLevel"] = spiceLevel;

    const dishes = await Dish.find(query)
        .populate({
            path: "chef",
            select: "fullName avatar averageRating serviceLocations",
        })
        .sort({ ordersCount: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Dish.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                dishes,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                },
            },
            "Dishes fetched successfully"
        )
    );
});

export {
    getAllChefs,
    getChefById,
    searchChefs,
    getChefDishes,
    getDishById,
    searchDishes,
};
