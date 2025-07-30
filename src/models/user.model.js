import mongoose from "mongoose";


const userSchema =new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String,
            required:true,
        },
        coverImage:{
            type:String,

        },
        WatchHistory:[

            {
                type:Schema.type.ObjectId,
                ref:"Bookings"
            }
        ],
        password:{
            type:String,
            required:[true,'password is required']
        },

        refreshToken:{
            type:String,
        }

        


},{
    timeshape:true
})


userSchema.pre("save" , async  function (next){

    if(!this.isModified("password")) return next();
    this.password=bcrypt.hash(this.password,10)
    next()

})

userSchema.methods.isPasswordCorrect=async function (password){

    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccesToken=function(){
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname
    },

    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}


userSchema.methods.generateAccesToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.REFRESH_TOKEN_SECRET,{

            expiresIn:process.env.REFRESH_TOKEN_EXPIRY 
        }
    )
}

export const User =mongoose.model("User",userSchema)