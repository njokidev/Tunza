from django.urls import path
from . import views

urlpatterns = [
    path('',                              views.ConversationListView.as_view(),       name='conversations'),
    path('start/',                        views.GetOrCreateConversationView.as_view(), name='start_conv'),
    path('<uuid:conv_id>/messages/',      views.MessageListView.as_view(),            name='messages'),
]
