from django.db import models


class Scan(models.Model):

    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='pdfs/')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.filename}"
