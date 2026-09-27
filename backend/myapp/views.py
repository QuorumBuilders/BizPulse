from django.http import JsonResponse


def handler404(request, exception):
    return JsonResponse(
        {
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested URL was not found.",
                "details": {},
            }
        },
        status=404,
    )