from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User, Notification
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return self.request.user.conversations.prefetch_related('participants', 'messages')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class GetOrCreateConversationView(APIView):
    """Start a conversation with another user (patient↔caregiver)."""

    def post(self, request):
        other_id = request.data.get('user_id')
        try:
            other = User.objects.get(id=other_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # look for an existing conv between these two
        conv = (
            request.user.conversations
            .filter(participants=other)
            .first()
        )
        if not conv:
            conv = Conversation.objects.create()
            conv.participants.set([request.user, other])

        return Response(ConversationSerializer(conv, context={'request': request}).data)


class MessageListView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer

    def get_conversation(self):
        try:
            return self.request.user.conversations.get(pk=self.kwargs['conv_id'])
        except Conversation.DoesNotExist:
            return None

    def get_queryset(self):
        conv = self.get_conversation()
        if not conv:
            return Message.objects.none()
        # mark messages from the other person as read
        conv.messages.exclude(sender=self.request.user).update(is_read=True)
        return conv.messages.select_related('sender')

    def perform_create(self, serializer):
        conv = self.get_conversation()
        if not conv:
            from rest_framework.exceptions import NotFound
            raise NotFound()
        msg = serializer.save(sender=self.request.user, conversation=conv)
        # notify other participant
        other = conv.participants.exclude(id=self.request.user.id).first()
        if other:
            Notification.objects.create(
                user=other,
                title=f'New message from {self.request.user.full_name}',
                body=msg.body[:80],
                type='message',
            )
