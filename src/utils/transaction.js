import mongoose from "mongoose";

const TRANSACTION_NOT_SUPPORTED_PATTERNS = [
    "Transaction numbers are only allowed on a replica set member",
    "Transaction numbers are only allowed on a sharded cluster",
    "does not support retryable writes",
];

const isTransactionUnsupported = (error) => {
    const message = error?.message || "";
    return TRANSACTION_NOT_SUPPORTED_PATTERNS.some((pattern) =>
        message.includes(pattern)
    );
};

export const withTransaction = async (work) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const result = await work(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        try {
            await session.abortTransaction();
        } catch {
            // Ignore abort errors.
        }

        if (isTransactionUnsupported(error)) {
            return work(null);
        }

        throw error;
    } finally {
        await session.endSession();
    }
};
