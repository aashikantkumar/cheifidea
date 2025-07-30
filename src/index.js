import dotenv from "dotenv"
import connectDB from "./db/index.js"
import {app} from "./app.js";
import mongoose from "mongoose";

dotenv.config({

    path:'./env'
})

connectDB()

 .then(
    ()=>{
        app.listen(process.env.PORT|| 8000,()=>{

            console.log(`Server is running at port:${process.env.PORT}`)
        })

        app.on("error",(error)=>{
            console.log("ERRR:",error);
            throw error
        })
    }) 
   .catch((err)=>{
    console.log("Mogo db connection failed !!!",err)
       
    }  
    )