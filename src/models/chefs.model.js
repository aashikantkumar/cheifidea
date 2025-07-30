 import mongoose ,{Schema} from "mongoose";
 import jwt from "jsonwebtoken"
 import bcrypt from "bcrypt"

 const chefsSchema = new Schema(
    {
         name:{
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
            lowecase:true,
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

         watchHistory:[
            {
                type:Schema.types.ObjectId,
                ref:"Dishe"       ///here we have to change
            }

         ],
         password:{

            type:String,
            required:[true,'Password is required']
         },

         refreshToken:{
            type:String,
  
         }
         
    },{
        timeshampe:true
    }
  )


  //to bcrypt the password 
chefsSchema.pre("save",async function(next){

   if(!this.isModified("password")) return next();
   this.password=  await bcrypt.hash(this.password,10)
   next()
})

chefsSchema.methods.isPasswordCorrect=async function(password){
   return await  bcrypt.compare(password,this.password)
}

chefsSchema.methods.generateAccesToken=function(){
    return jwt.sign(
      {
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
chefsSchema.methods.generateAccesToken=function(){
   return jwt.sign(
      {
         _id:this._id,
         email:this.email,
         username:this.username,
         fullname:this.fullname
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
         expiresIn:process.env.REFRESH_TOKEN_EXPIRY
      }
   )
}
 export const Chefs =mongoose.model("Chefs",chefsSchema)