import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DB_NAME = "cheifidea_db";

// Connect to MongoDB with correct database name
mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    .then(async () => {
        console.log("✅ Connected to MongoDB");
        console.log("📍 Database:", mongoose.connection.db.databaseName);

        const db = mongoose.connection.db;
        
        // Check if collection exists
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log("\n📦 Existing collections:", collectionNames.join(", ") || "None");

        if (!collectionNames.includes("chefprofiles")) {
            console.log("\n✓ Collection 'chefprofiles' doesn't exist yet - this is normal for a new database");
            console.log("✓ No indexes to drop");
            console.log("✓ The problematic index will not be created with the fixed model");
            console.log("\n✅ Done! You can now register chefs without the parallel array error.");
            process.exit(0);
            return;
        }

        const collection = db.collection("chefprofiles");

        // Get existing indexes
        try {
            const indexes = await collection.indexes();
            console.log("\n📋 Current indexes:");
            indexes.forEach(idx => {
                console.log(`  - ${idx.name}`);
            });

            // Drop the problematic compound index if it exists
            try {
                await collection.dropIndex("serviceLocations.city_1_specialization_1");
                console.log("\n✅ Dropped old problematic index: serviceLocations.city_1_specialization_1");
            } catch (error) {
                if (error.code === 27 || error.codeName === "IndexNotFound") {
                    console.log("\n✓ Problematic index doesn't exist (already removed or never created)");
                } else {
                    console.error("\n⚠️ Error dropping index:", error.message);
                }
            }

            // List indexes after cleanup
            const newIndexes = await collection.indexes();
            console.log("\n📋 Indexes after cleanup:");
            newIndexes.forEach(idx => {
                console.log(`  - ${idx.name}`);
            });
        } catch (error) {
            console.error("\n❌ Error accessing indexes:", error.message);
        }

        console.log("\n✅ Done! Restart your server now.");
        process.exit(0);
    })
    .catch(error => {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    });
