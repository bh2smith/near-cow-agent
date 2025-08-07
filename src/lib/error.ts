interface CowAPIErrorBody {
  errorType?: string;
  description?: string;
}

/**
 * Parses CoW Protocol API errors to extract meaningful error messages
 * @param error - The error object from the CoW Protocol API
 * @returns A user-friendly error message
 */
export function parseCowAPIError(error: unknown): string {
  // Default error message
  let errorMessage = "Unknown CoW Protocol API error";
  if (error && typeof error === "object") {
    // Check if it's a CoW Protocol API error with structured response

    if ("body" in error && error.body && typeof error.body === "object") {
      const errorBody = error.body as CowAPIErrorBody;

      if (errorBody.errorType && errorBody.description) {
        errorMessage = `${errorBody.errorType}: ${errorBody.description}`;
      } else if (errorBody.description) {
        errorMessage = errorBody.description;
      }
    }

    // Fallback to standard error message if available
    else if ("message" in error && typeof error.message === "string") {
      errorMessage = error.message;
    }
  }

  return errorMessage;
}

export const withCowErrorHandling = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch((e: unknown) => {
    const error = parseCowAPIError(e);
    console.error(error);
    throw new Error(error);
  });

export const withRedactedErrorHandling = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    console.error(message);
    throw new Error(redactAlchemyKey(message));
  });

const ALCHEMY_KEY_REGEX =
  /https:\/\/[^/]+\.alchemy\.com\/v2\/[a-zA-Z0-9_-]{20,}/g;

function redactAlchemyKey(str: string): string {
  return str.replace(ALCHEMY_KEY_REGEX, (match) => {
    const parts = match.split("/");
    return parts.slice(0, -1).join("/") + "/<REDACTED>";
  });
}
