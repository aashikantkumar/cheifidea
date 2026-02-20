import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ChefProfile } from "../../models/chefProfile.model.js";

const MODERATION_FIELDS =
    "fullName avatar phone specialization pricePerHour accountStatus isApproved isAvailable createdAt";

const updateChefState = async (chefId, updates, successMessage) => {
    const updatedProfile = await ChefProfile.findByIdAndUpdate(
        chefId,
        { $set: updates },
        { new: true }
    ).select(MODERATION_FIELDS);

    if (!updatedProfile) {
        throw new ApiError(404, "Chef profile not found");
    }

    return {
        updatedProfile,
        successMessage,
    };
};

export const getPendingChefs = asyncHandler(async (_req, res) => {
    const pendingChefs = await ChefProfile.find({ accountStatus: "pending" })
        .select(MODERATION_FIELDS)
        .sort({ createdAt: 1 });

    return res
        .status(200)
        .json(new ApiResponse(200, pendingChefs, "Pending chefs fetched"));
});

export const approveChef = asyncHandler(async (req, res) => {
    const { updatedProfile, successMessage } = await updateChefState(
        req.params.chefId,
        {
            isApproved: true,
            accountStatus: "active",
        },
        "Chef approved successfully"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProfile, successMessage));
});

export const rejectChef = asyncHandler(async (req, res) => {
    const { updatedProfile, successMessage } = await updateChefState(
        req.params.chefId,
        {
            isApproved: false,
            accountStatus: "inactive",
            isAvailable: false,
        },
        "Chef rejected successfully"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProfile, successMessage));
});

export const suspendChef = asyncHandler(async (req, res) => {
    const { updatedProfile, successMessage } = await updateChefState(
        req.params.chefId,
        {
            accountStatus: "suspended",
            isAvailable: false,
        },
        "Chef suspended successfully"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProfile, successMessage));
});
