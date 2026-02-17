import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadCloudinary } from "../utils/cloudinary.js";


const generateAccessAndrefreshToken = async (userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken =User.generateAccesToken()
        const refreshToken =User.generateRefreshToken()


        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false})
        return {accessToken ,refreshToken}

    }catch(error){

        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) =>{

    const {fullName,email,username ,password }=req.body
    console.log("fullname",fullName);

    if([fullName,email,username, password].some((field)=>field?.trim()==="")){

        throw new ApiError(400,"All fields are required");
    }

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(400,"User already exists with this username and email")


    }

    const avatarLocalPath = req.file?.avatar[0]?.path;

    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(! avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
     }


    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar image");
    }
    
    const user= await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || " ",
        username:username.toLowerCase(),
        password,
        email,
    })

    const createdUser = await  User.findById(user._id).select("-password -refreshToken");
      if(!createdUser){
        throw new ApiError(500,"Failed to create user");
      }

      return res.status(201).json(
        new ApiResponse(201,"user created successfully")
      )


})

const loginUser = asyncHandler(async (req,res)=>{

    const {email,username,password}=req.body;

   if(!(username ||email)){
    throw new ApiError(400,"username or email is required")
   }

   const user= await User.findOne({
       $or:[{username},{email}]
   })

   if(!user){
    throw new ApiError(404,"user  does not exist");

   }

   const isPasswordVaid= await user.isPasswordCorrect(password);

   if(!isPasswordVaid){

    throw new ApiError(400,"Invalid Password")
   }

     const { accessToken , refreshToken} = await  generateAccessAndrefreshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly:true,
        secure:true

    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },"User logged in successfully  "
        )
    )

})

const logoutUser= asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined

            }
        },{
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(
    async (req, res)=>{
        const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

   if(!incomingRefreshToken){

    throw new ApiError(401,"unauthorized request")
   }
   try{
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user =User.findById(decodedToken?._id)
    if(!user){

       throw new ApiError(404,"user not found")
    }

    const options ={
        httpOnly:true,
        secure:true
    }
    const {accessToken,newrefreshToken} = await  generateAccessAndrefreshToken (user._id)

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
        new ApiResponse(
            200,{
                accessToken, refreshAccessToken:newrefreshToken},"Access token refreshed "
            )

    )
   }catch(error){

    throw new ApiError(401,error?.message || "Invalid refresh token")
   }
    })

    const changePassword = asyncHandler(async(req,res)=>{
        const {oldPassword,newPassword}=req.body;
        const user = await User.findById(req,res)
        const isPasswordCorrect =await user.isPasswordCorrect (oldPassword);
        if(!isPasswordCorrect){
            throw new ApiError(400,"Invalid old password")
        }

        user.password = newPassword;
        await user.save({validateBeforeSave:false})

        return res.status(200)
        .json(
            new ApiResponse(200,{},"Password Changed successfully")
        )
    })

    const getCurrentUser = asyncHandler(async(req,res)=>{
        return res.status(200)
            .json(
                200,req.user,"current user fetched successfully"

            )
        
    })

    const updateAccoundDetails = asyncHandler(async(req,res)=>{
        const {fullName,email}=req.body
        if(!fullName || !email){
            throw new ApiError(400,"All fields are required")
        }

        User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullName:fullName,
                    email:email,
                }
            },{new:true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200,User,"Account details updated successfully")
        )
    })

    const updateUserAvatar = asyncHandler(async(req,res)=>{
        const avatorLocalpath =req.file?.path;
        if(!avatorLocalpath){
            throw new ApiError(400,"Avatar file is required")

        }
        const avatar = await uploadCloudinary(avatorLocalpath)

        if(!avatar.url){
           throw new ApiError(500,"Error while uploading avatar imagge")

        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    avatar:avatar.url
                }
            },
            {new:true}
        ).select("-password ")

        return res
        .status(200)
        .json(
            new ApiResponse(200,user,"Avatar updated successfully")
        )
    })


    export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changePassword,
        getCurrentUser,
        updateAccoundDetails,
        updateUserAvatar
    }



