import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const buildMongoUri = () => {
    const normalizedBaseUri = env.MONGODB_URI.replace(/\/+$/, "");
    return `${normalizedBaseUri}/${env.DB_NAME}`;
};

const connectDB = async () => {
    const connectionInstance = await mongoose.connect(buildMongoUri(), {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 10000,
    });

    logger.info(
        { host: connectionInstance.connection.host, db: env.DB_NAME },
        "mongodb connected"
    );

    return connectionInstance;
};

export const disconnectDB = async () => {
    await mongoose.connection.close();
    logger.info("mongodb connection closed");
};

export const isDbReady = () => mongoose.connection.readyState === 1;

export default connectDB;
