from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User, Notification
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


def _have_relationship(patient, caregiver_user):
    """True if this family and caregiver are linked by a booking, a match or an application."""
    from bookings.models import Booking
    from care_requests.models import CareMatch, CareApplication
    return (
        Booking.objects.filter(patient=patient, caregiver__user=caregiver_user).exists()
        or CareMatch.objects.filter(care_request__patient=patient, caregiver__user=caregiver_user).exists()
        or CareApplication.objects.filter(care_request__patient=patient, caregiver__user=caregiver_user).exists()
    )


def _can_chat(me, other):
    if me.id == other.id:
        return False, 'You cannot message yourself.'
    if me.role == 'admin' or other.role == 'admin':
        return True, ''
    roles = {me.role, other.role}
    if roles != {'patient', 'caregiver'}:
        return False, 'Messages are only between families and caregivers.'
    if me.role == 'patient':
        # families may contact any verified caregiver before booking
        if other.is_verified or _have_relationship(me, other):
            return True, ''
        return False, 'This caregiver is not verified yet.'
    # caregivers may only message families they are working with
    if _have_relationship(other, me):
        return True, ''
    return False, 'You can message a family once they book you or respond to your application.'


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return self.request.user.conversations.prefetch_related('participants', 'messages').order_by('-created_at')

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

        allowed, reason = _can_chat(request.user, other)
        if not allowed:
            return Response({'detail': reason}, status=status.HTTP_403_FORBIDDEN)

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
