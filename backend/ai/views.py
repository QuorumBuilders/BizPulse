from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .serializers import TranscriptionSerializer
from .services import transcribe_audio, route_extraction


class TranscriptionView(generics.CreateAPIView):
    serializer_class = TranscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        intent = serializer.validated_data.get("intent")

        transcription = transcribe_audio(
            serializer.validated_data["audio"]
        )
        language = transcription["language"]
        try:
            results = route_extraction(transcription["text"], intent=intent)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "data": {
                "transcription": transcription["text"],
                "language": language,
                "results": results,
            },
            "meta": {}
        })