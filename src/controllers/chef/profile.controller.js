import { asyncHandler } from "../../utils/asyncHandler.js";
import { Account } from "../../models/account.model.js";
import { ChefProfile } from "../../models/chefProfile.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

// ─── Get Chef Profile ──────────────────────────────────────────
export const getChefProfile = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id)
        .select("-password -refreshToken")
        .populate({
            path: "chefProfile",
            populate: { path: "dishes", model: "Dish" },
        });

    if (!account) throw new ApiError(404, "Chef not found");

    return res
        .status(200)
        .json(new ApiResponse(200, account, "Chef profile fetched successfully"));
});

// ─── Update Chef Profile ───────────────────────────────────────
export const updateChefProfile = asyncHandler(async (req, res) => {
    const {
        fullName, phone, bio, specialization, experience,
        pricePerHour, minimumBookingHours, serviceLocations,
        workingHours, bankDetails, socialLinks,
    } = req.body;

    const account = await Account.findById(req.user._id);
    if (!account?.chefProfile) throw new ApiError(404, "Chef profile not found");

    // Build update object with only provided fields
    const updateFields = {};
    if (fullName)             updateFields.fullName             = fullName;
    if (phone)                updateFields.phone                = phone;
    if (bio !== undefined)    updateFields.bio                  = bio;
    if (specialization)       updateFields.specialization       = specialization;
    if (experience)           updateFields.experience           = experience;
    if (pricePerHour)         updateFields.pricePerHour         = pricePerHour;
    if (minimumBookingHours)  updateFields.minimumBookingHours  = minimumBookingHours;
    if (serviceLocations)     updateFields.serviceLocations     = serviceLocations;
    if (workingHours)         updateFields.workingHours         = workingHours;
    if (bankDetails)          updateFields.bankDetails          = bankDetails;
    if (socialLinks)          updateFields.socialLinks          = socialLinks;

    const updatedProfile = await ChefProfile.findByIdAndUpdate(
        account.chefProfile,
        { $set: updateFields },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProfile, "Chef profile updated successfully"));
});
