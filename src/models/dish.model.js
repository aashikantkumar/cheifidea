import mongoose, { Schema } from "mongoose";

const dishSchema = new Schema(
    {
        // Owner chef
        chef: {
            type: Schema.Types.ObjectId,
            ref: "ChefProfile",
            required: true,
            index: true
        },

        // Dish Details
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            maxlength: 1000
        },
        category: {
            type: String,
            required: true,
            enum: [
                "Appetizer", "Main Course", "Dessert", "Beverage",
                "Snack", "Breakfast", "Salad", "Soup", "Side Dish"
            ]
        },
        cuisine: {
            type: String,
            required: true,
            enum: [
                "Italian", "Chinese", "Indian", "Mexican",
                "Japanese", "French", "Thai", "Continental",
                "Fusion", "Other"
            ]
        },

        // Media
        images: [
            {
                type: String // Cloudinary URLs
            }
        ],
        videoUrl: String,

        // Cooking Info
        preparationTime: {
            type: Number, // minutes
            required: true
        },
        cookingTime: {
            type: Number, // minutes
            required: true
        },
        servings: {
            type: Number,
            default: 1,
            min: 1
        },

        // Pricing
        price: {
            type: Number,
            required: true,
            min: 0
        },

        // Ingredients
        ingredients: [
            {
                name: { type: String, required: true },
                quantity: String,
                unit: String
            }
        ],

        // Dietary Info
        dietaryInfo: {
            isVegetarian:  { type: Boolean, default: false },
            isVegan:       { type: Boolean, default: false },
            isGlutenFree:  { type: Boolean, default: false },
            isLactoseFree: { type: Boolean, default: false },
            spiceLevel: {
                type: String,
                enum: ["None", "Mild", "Medium", "Hot", "Extra Hot"],
                default: "Mild"
            },
            allergens: [String]
        },

        // Tags for search
        tags: [String],

        // Availability
        isAvailable: {
            type: Boolean,
            default: true
        },

        // Stats
        ordersCount: {
            type: Number,
            default: 0
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        }
    },
    {
        timestamps: true
    }
);

// Indexes
dishSchema.index({ chef: 1, isAvailable: 1 });
dishSchema.index({ category: 1, cuisine: 1 });
dishSchema.index({ tags: 1 });
dishSchema.index({ name: "text", description: "text" });

export const Dish = mongoose.model("Dish", dishSchema);
