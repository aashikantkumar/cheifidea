import mongoose, { Schema } from "mongoose";

const chefProfileSchema = new Schema(
    {
        account: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            unique: true
        },

        // Basic Info
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        phone: {
            type: String,
            required: true
        },
        avatar: {
            type: String,
            required: true
        },
        coverImage: {
            type: String
        },
        bio: {
            type: String,
            maxlength: 500
        },

        // Professional Details
        specialization: [
            {
                type: String,
                enum: [
                    "Italian", "Chinese", "Indian", "Mexican",
                    "Japanese", "French", "Thai", "Continental",
                    "BBQ", "Desserts", "Vegan", "Fusion", "Street Food"
                ]
            }
        ],
        experience: {
            type: Number,
            required: true,
            min: 0
        },
        certification: [
            {
                name: String,
                issuer: String,
                year: Number,
                document: String
            }
        ],

        // Service Area
        serviceLocations: [
            {
                city: { type: String, required: true },
                state: String,
                country: String,
                radius: Number
            }
        ],

        // Availability
        workingHours: {
            monday:    { available: { type: Boolean, default: true }, slots: [{ start: String, end: String }] },
            tuesday:   { available: { type: Boolean, default: true }, slots: [{ start: String, end: String }] },
            wednesday: { available: { type: Boolean, default: true }, slots: [{ start: String, end: String }] },
            thursday:  { available: { type: Boolean, default: true }, slots: [{ start: String, end: String }] },
            friday:    { available: { type: Boolean, default: true }, slots: [{ start: String, end: String }] },
            saturday:  { available: { type: Boolean, default: true }, slots: [{ start: String, end: String }] },
            sunday:    { available: { type: Boolean, default: false }, slots: [{ start: String, end: String }] }
        },

        // Dynamic Dishes
        dishes: [
            {
                type: Schema.Types.ObjectId,
                ref: "Dish"
            }
        ],

        // Pricing
        pricePerHour: {
            type: Number,
            required: true,
            min: 0
        },
        minimumBookingHours: {
            type: Number,
            default: 2
        },

        // Stats & Ratings
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        totalBookings: {
            type: Number,
            default: 0
        },
        completedBookings: {
            type: Number,
            default: 0
        },

        // Account Status
        isApproved: {
            type: Boolean,
            default: false
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        accountStatus: {
            type: String,
            enum: ["pending", "active", "inactive", "suspended"],
            default: "pending"
        },

        // Payment Details
        bankDetails: {
            accountNumber: String,
            ifscCode: String,
            accountHolderName: String,
            bankName: String,
            upiId: String
        },

        // Portfolio
        portfolioImages: [
            {
                url: String,
                caption: String
            }
        ],

        // Social Links
        socialLinks: {
            instagram: String,
            facebook: String,
            youtube: String
        }
    },
    {
        timestamps: true
    }
);

// Indexes for search
chefProfileSchema.index({ "serviceLocations.city": 1, specialization: 1 });
chefProfileSchema.index({ averageRating: -1, totalBookings: -1 });
chefProfileSchema.index({ isApproved: 1, isAvailable: 1 });

export const ChefProfile = mongoose.model("ChefProfile", chefProfileSchema);
