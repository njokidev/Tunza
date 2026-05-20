from django.db import models
from accounts.models import User
import uuid

class Conversation(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        names = ', '.join(p.full_name for p in self.participants.all())
        return f'Conv: {names}'


class Message(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    body         = models.TextField()
    is_read      = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
