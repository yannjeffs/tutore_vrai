import uuid
import threading
from django.db import models
from django.utils import timezone

request_cfg = threading.local()

class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class BaseModel(models.Model):
    """Base model with soft delete and UUID."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])
        
        # Log deletion
        if hasattr(request_cfg, 'user') and request_cfg.user:
            AuditLog.objects.create(
                user=request_cfg.user,
                action='DELETE',
                table_name=self._meta.db_table,
                record_id=str(self.id),
                ip_address=getattr(request_cfg, 'ip_address', None)
            )

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])

    @property
    def is_deleted(self):
        return self.deleted_at is not None

class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('auth.User', null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=50) # CREATE, UPDATE, DELETE
    table_name = models.CharField(max_length=100)
    record_id = models.CharField(max_length=50)
    changes = models.JSONField(null=True)
    ip_address = models.GenericIPAddressField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on {self.table_name} by {self.user}"