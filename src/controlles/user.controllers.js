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
        const incomingTefreshToken = req.cookies.refreshAccessToken
    }
)


