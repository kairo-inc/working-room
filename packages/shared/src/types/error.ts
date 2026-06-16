// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isErrorEqual = <T extends BaseError>(error: unknown, expected: new (...args: any[]) => T) => {
  if (error instanceof BaseError) {
    // NOTE: We only care about the errorCode, so we can ignore the message.
    const e = new expected("")
    return error.errorCode === e.errorCode
  }
  return false
}

export abstract class BaseError extends Error {
  // Same as HTTP status code, e.g., 404, 500, etc.
  public abstract statusCode: number
  // This must be unique for each error type.
  public abstract errorCode: string

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = this.constructor.name
  }
}

//// Popular error types can be defined here, and more can be added as needed.
export class NotFoundError extends BaseError {
  public statusCode = 404
  public errorCode = "NOT_FOUND"
}

export class AlreadyExistsError extends BaseError {
  public statusCode = 400
  public errorCode = "ALREADY_EXISTS"
}

export class NotSupportedError extends BaseError {
  public statusCode = 400
  public errorCode = "NOT_SUPPORTED"
}

export class NoContextError extends BaseError {
  public statusCode = 500
  public errorCode = "NO_CONTEXT"
}

export class BadRequestError extends BaseError {
  public statusCode = 400
  public errorCode = "BAD_REQUEST"
}

export class InvalidChatDirAccessError extends BaseError {
  public statusCode = 400
  public errorCode = "INVALID_CHAT_DIR_ACCESS"
}

export class InvalidPrivateDirAccessError extends BaseError {
  public statusCode = 400
  public errorCode = "INVALID_PRIVATE_DIR_ACCESS"
}

export class InvalidSharedDirAccessError extends BaseError {
  public statusCode = 400
  public errorCode = "INVALID_SHARED_DIR_ACCESS"
}

export class InternalServerError extends BaseError {
  public statusCode = 500
  public errorCode = "INTERNAL_SERVER_ERROR"
}

export class ConfigError extends BaseError {
  public statusCode = 500
  public errorCode = "CONFIG_ERROR"
}

export class ImplementationError extends BaseError {
  public statusCode = 500
  public errorCode = "IMPLEMENTATION_ERROR"
}

export class AuthenticationError extends BaseError {
  public statusCode = 401
  public errorCode = "AUTHENTICATION_ERROR"
}

export class PermissionDeniedError extends BaseError {
  public statusCode = 403
  public errorCode = "PERMISSION_DENIED"
}

// Chat related errors
export class MaximumAgentCallExceededError extends BaseError {
  public statusCode = 400
  public errorCode = "MAXIMUM_AGENT_CALL_EXCEEDED"
}

// This is not actually an error, but we can use it to indicate that the user needs to initialize their password.
export class PasswordInitializationRequired extends BaseError {
  public statusCode = 307
  public errorCode = "PASSWORD_INITIALIZATION_REQUIRED"
}

export class NotImplementedError extends BaseError {
  public statusCode = 501
  public errorCode = "NOT_IMPLEMENTED"
}

export class UnknownError extends BaseError {
  public statusCode = 500
  public errorCode = "UNKNOWN_ERROR"
}

export class ChatAbortError extends BaseError {
  public statusCode = 400
  public errorCode = "CHAT_ABORTED"
  constructor() {
    super("Chat was aborted by the user.")
  }
}

export class InvalidAiConfigError extends BaseError {
  public statusCode = 401
  public errorCode = "INVALID_AI_CONFIG"
}

export class AiRateLimitError extends BaseError {
  public statusCode = 429
  public errorCode = "AI_RATE_LIMIT"
}

export class AiProviderError extends BaseError {
  public statusCode = 502
  public errorCode = "AI_PROVIDER_ERROR"
}
