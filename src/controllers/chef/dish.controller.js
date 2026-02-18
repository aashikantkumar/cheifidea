import { asyncHandler } from "../../utils/asyncHandler.js";
import { Account } from "../../models/account.model.js";
import { ChefProfile } from "../../models/chefProfile.model.js";
import { Dish } from "../../models/dish.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { findChefProfile } from "../../services/chef.service.js";

// ─── Add Dish ──────────────────────────────────────────────────
export const addDish = asyncHandler(async (req, res) => {
    const {
        name, description, category, cuisine,
        preparationTime, cookingTime, servings,
        price, ingredients, dietaryInfo, tags,
    } = req.body;

    if (!name || !description || !category || !cuisine || !price) {
        throw new ApiError(400, "Required dish fields are missing");
    }
    if (!preparationTime || !cookingTime) {
        throw new ApiError(400, "Preparation time and cooking time are required");
    }

    const { chefProfile } = await findChefProfile(req.user._id);

    // Upload dish images (optional)
    const imageUrls = [];
    if (req.files?.length) {
        for (const file of req.files) {
            const uploaded = await uploadOnCloudinary(file.path);
            if (uploaded) imageUrls.push(uploaded.url);
        }
    }

    // Parse JSON string fields
    const parsedIngredients = typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients || [];
    const parsedDietaryInfo = typeof dietaryInfo === "string" ? JSON.parse(dietaryInfo) : dietaryInfo || {};
    const parsedTags        = typeof tags === "string"        ? JSON.parse(tags)        : tags        || [];

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

    chefProfile.dishes.push(dish._id);
    await chefProfile.save();

    return res.status(201).json(new ApiResponse(201, dish, "Dish added successfully"));
});

// ─── Update Dish ───────────────────────────────────────────────
export const updateDish = asyncHandler(async (req, res) => {
    const { dishId } = req.params;
    const { chefProfile } = await findChefProfile(req.user._id);

    const dish = await Dish.findById(dishId);
    if (!dish) throw new ApiError(404, "Dish not found");
    if (dish.chef.toString() !== chefProfile._id.toString()) {
        throw new ApiError(403, "You can only update your own dishes");
    }

    const ALLOWED_FIELDS = [
        "name", "description", "category", "cuisine",
        "preparationTime", "cookingTime", "servings",
        "price", "ingredients", "dietaryInfo", "tags",
        "isAvailable", "videoUrl",
    ];

    const updateFields = {};
    for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    }

    const updatedDish = await Dish.findByIdAndUpdate(
        dishId,
        { $set: updateFields },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedDish, "Dish updated successfully"));
});

// ─── Delete Dish ───────────────────────────────────────────────
export const deleteDish = asyncHandler(async (req, res) => {
    const { dishId } = req.params;
    const { chefProfile } = await findChefProfile(req.user._id);

    const dish = await Dish.findById(dishId);
    if (!dish) throw new ApiError(404, "Dish not found");
    if (dish.chef.toString() !== chefProfile._id.toString()) {
        throw new ApiError(403, "You can only delete your own dishes");
    }

    await Dish.findByIdAndDelete(dishId);
    await ChefProfile.findByIdAndUpdate(chefProfile._id, { $pull: { dishes: dishId } });

    return res.status(200).json(new ApiResponse(200, {}, "Dish deleted successfully"));
});

// ─── Get Chef's Own Dishes ─────────────────────────────────────
export const getChefDishes = asyncHandler(async (req, res) => {
    const { chefProfile } = await findChefProfile(req.user._id);
    const { category, isAvailable } = req.query;

    const query = { chef: chefProfile._id };
    if (category)              query.category    = category;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

    const dishes = await Dish.find(query).sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, dishes, "Dishes fetched successfully"));
});
