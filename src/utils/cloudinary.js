import {v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary=async (localFilePath)=>{

    try{
        if(!localFilePath) return null;
        //uploading the file to cloudinary 
        const respone = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully

        console.log("File uploaded successfully to cloudinary:", respone.url);
        fs.unlinkSync(localFilePath); // remove local file after upload
        return respone;

    }catch(error){
        fs.unlinkSync(localFilePath); // remove the file from local save temporray file 
          return null;

    }
}
export {uploadOnCloudinary};
