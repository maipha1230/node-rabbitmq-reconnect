const { sleep } = require('./sleep');


/**
 * Retries an asynchronous operation a specified number of times with a delay between attempts.
 *
 * @param {() => Promise<any>} operation - The asynchronous operation to be retried. Should be a function that returns a promise.
 * @param {number} maxAttempts - The maximum number of retry attempts.
 * @param {number} waitTimeMS - The wait time (in milliseconds) between retry attempts.
 * @returns {Promise<any>} - Resolves with the result of the operation if successful.
 * @throws {Error} - Throws the last encountered error if all retry attempts fail.
 */
async function retry(operation, maxAttempts, waitTimeMS) {
    let lastError;

    while (maxAttempts-- > 0) {
        try {
            const result = await operation();
            return result;
        }
        catch (err) {
            if (maxAttempts >= 1) {
                console.log("wait...")
            }
            else {
                console.error("Operation failed, no more retries allowed.");
            }

            lastError = err;

            await sleep(waitTimeMS);
        }
    }

    if (!lastError) {
        throw new Error("Expected there to be an error!");
    }

    throw lastError;
}    

module.exports = { retry };