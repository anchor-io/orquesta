export type Result<TValue, TError> =
  | {
      success: true;
      value: TValue;
      error?: never;
    }
  | {
      success: false;
      value?: never;
      error: TError;
    };

export function Ok<TValue>(value: TValue): Result<TValue, never> {
  return {
    success: true,
    value,
  };
}

export function Err<TError>(error: TError): Result<never, TError> {
  return {
    success: false,
    error,
  };
}

export function isOk<TValue, TError>(
  result: Result<TValue, TError>,
): result is { success: true; value: TValue; error?: never } {
  return result.success === true;
}

export function isErr<TValue, TError>(
  result: Result<TValue, TError>,
): result is { success: false; value?: never; error: TError } {
  return result.success === false;
}
