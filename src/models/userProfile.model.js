import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema(
    {
        account: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            unique: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        username: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        phone: {
            type: String,
            required: true
        },
        avatar: {
            type: String,
            default: ""
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        bookingHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Booking"
            }
        ],
        favoriteChefs: [
            {
                type: Schema.Types.ObjectId,
                ref: "ChefProfile"
            }
        ],
        savedDishes: [
            {
                type: Schema.Types.ObjectId,
                ref: "Dish"
            }
        ]
    },
    {
        timestamps: true
    }
);

export const UserProfile = mongoose.model("UserProfile", userProfileSchema);
