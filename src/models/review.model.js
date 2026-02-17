import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
    {
        booking: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "UserProfile",
            required: true
        },
        chef: {
            type: Schema.Types.ObjectId,
            ref: "ChefProfile",
            required: true,
            index: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        foodQuality: {
            type: Number,
            min: 1,
            max: 5
        },
        professionalism: {
            type: Number,
            min: 1,
            max: 5
        },
        punctuality: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 1000
        },
        images: [
            {
                type: String // Photos of prepared dishes
            }
        ],
        chefResponse: {
            comment: String,
            respondedAt: Date
        }
    },
    {
        timestamps: true
    }
);

// One review per booking
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ chef: 1, rating: -1 });

export const Review = mongoose.model("Review", reviewSchema);
