from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_scan, name='upload_scan'),
]