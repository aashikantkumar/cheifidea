import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";

const accountSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        role: {
            type: String,
            enum: ["user", "chef", "admin"],
            required: true,
            default: "user"
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        refreshToken: {
            type: String
        },
        userProfile: {
            type: Schema.Types.ObjectId,
            ref: "UserProfile"
        },
        chefProfile: {
            type: Schema.Types.ObjectId,
            ref: "ChefProfile"
        }
    },
    {
        timestamps: true
    }
);

// Password hashing before save
accountSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Verify password
accountSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Generate Access Token
accountSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role
        },
        env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: env.ACCESS_TOKEN_EXPIRY
        }
    );
};

// Generate Refresh Token
accountSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const Account = mongoose.model("Account", accountSchema);
