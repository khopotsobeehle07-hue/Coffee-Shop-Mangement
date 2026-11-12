function logServerError(operation, error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const message = error instanceof Error
        ? error.message
        : "An unknown error occurred.";
    const safeMessage = message
        .replace(/\b(rediss?|https?):\/\/[^\s/@]+@/gi, "$1://[REDACTED]@")
        .replace(
            /\b(password|token|secret|authorization|credential)\s*[:=]\s*['"]?[^,\s'"]+/gi,
            "$1=[REDACTED]"
        );

    console.error(`[${operation}] ${errorName}: ${safeMessage}`);
}

module.exports = logServerError;
