
/**
 * @param {number} timeMS - The wait time (in milliseconds).
 * @returns {Promise<any>} - Resolves.
 */
function sleep(timeMS) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), timeMS);
    });
}

module.exports = { sleep };