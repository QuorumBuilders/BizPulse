from rest_framework import generics


class StandardResponseMixin:
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        response.data = {
            "data": response.data,
            "meta": {},
        }

        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)

        response.data = {
            "data": response.data,
            "meta": {},
        }

        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        response.data = {
            "data": response.data,
            "meta": {},
        }

        return response


class StandardListCreateAPIView(
    StandardResponseMixin,
    generics.ListCreateAPIView,
):
    pass


class StandardRetrieveUpdateDestroyAPIView(
    StandardResponseMixin,
    generics.RetrieveUpdateDestroyAPIView,
):
    pass