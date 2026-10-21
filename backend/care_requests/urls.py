from django.urls import path
from . import views

urlpatterns = [
    path("",                                          views.CreateCareRequestView.as_view(),         name="create_cr"),
    path("mine/",                                     views.MyCareRequestsView.as_view(),            name="my_cr"),
    path("open/",                                     views.OpenRequestsView.as_view(),              name="open_requests"),
    path("<uuid:pk>/matches/",                        views.CareRequestMatchesView.as_view(),        name="cr_matches"),
    path("<uuid:pk>/matches/<uuid:match_id>/shortlist/", views.ShortlistMatchView.as_view(),         name="shortlist"),
    path("<uuid:pk>/matches/<uuid:match_id>/book/",  views.BookFromMatchView.as_view(),              name="book_from_match"),
    path("<uuid:pk>/apply/",                          views.ApplyToCareRequestView.as_view(),        name="apply"),
    path("<uuid:pk>/applications/",                   views.CareRequestApplicationsView.as_view(),   name="cr_applications"),
    path("<uuid:pk>/applications/<uuid:app_id>/accept/", views.AcceptApplicationView.as_view(),      name="accept_app"),
    path("<uuid:pk>/applications/<uuid:app_id>/reject/", views.RejectApplicationView.as_view(),      name="reject_app"),
]
