from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    if isinstance(response.data, dict):
        details = response.data
    else:
        details = {"non_field_errors": response.data}

    status_code = response.status_code

    error_codes = {
        400: "BAD_REQUEST",
        401: "AUTHENTICATION_REQUIRED",
        403: "PERMISSION_DENIED",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        429: "THROTTLED",
    }

    code = error_codes.get(
        status_code,
        "API_ERROR",
    )

    messages = {
        400: "The request was invalid.",
        401: "Authentication credentials are required.",
        403: "You do not have permission to perform this action.",
        404: "The requested resource was not found.",
        405: "This HTTP method is not allowed.",
        409: "The request conflicts with the current state of the resource.",
        429: "Too many requests. Please try again later.",
    }

    response.data = {
        "error": {
            "code": code,
            "message": messages.get(
                status_code,
                "An error occurred while processing the request.",
            ),
            "details": details,
        }
    }

    return response