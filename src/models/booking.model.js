import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        // Who is booking
        user: {
            type: Schema.Types.ObjectId,
            ref: "UserProfile",
            required: true,
            index: true
        },

        // Which chef
        chef: {
            type: Schema.Types.ObjectId,
            ref: "ChefProfile",
            required: true,
            index: true
        },

        // What dishes
        dishes: [
            {
                dish: {
                    type: Schema.Types.ObjectId,
                    ref: "Dish"
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },
                price: Number // Price at time of booking
            }
        ],

        // Booking Details
        bookingDate: {
            type: Date,
            required: true,
            index: true
        },
        bookingTime: {
            type: String,
            required: true
        },
        eventType: {
            type: String,
            enum: [
                "Birthday Party", "Wedding", "Corporate Event",
                "Casual Dinner", "Festival", "Anniversary", "Other"
            ],
            default: "Casual Dinner"
        },
        guestCount: {
            type: Number,
            required: true,
            min: 1
        },

        // Location
        serviceLocation: {
            address: {
                type: String,
                required: true
            },
            city: String,
            state: String,
            zipCode: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },

        // Pricing
        dishesTotal: {
            type: Number,
            required: true
        },
        chefFee: {
            type: Number,
            required: true
        },
        platformFee: {
            type: Number,
            default: 0
        },
        taxes: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            required: true
        },

        // Payment
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "refunded", "failed"],
            default: "pending"
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "card", "upi", "wallet"]
        },
        paymentId: String,

        // Booking Status
        bookingStatus: {
            type: String,
            enum: ["pending", "confirmed", "in-progress", "completed", "cancelled"],
            default: "pending",
            index: true
        },

        // Special Instructions
        specialInstructions: {
            type: String,
            maxlength: 500
        },
        dietaryRestrictions: [String],

        // Cancellation
        cancellationReason: String,
        cancelledBy: {
            type: String,
            enum: ["user", "chef", "admin"]
        },
        cancelledAt: Date,

        // Completion
        completedAt: Date
    },
    {
        timestamps: true
    }
);

// Compound indexes
bookingSchema.index({ user: 1, bookingDate: -1 });
bookingSchema.index({ chef: 1, bookingDate: -1 });
bookingSchema.index({ bookingStatus: 1, bookingDate: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
