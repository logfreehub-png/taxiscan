from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """Faqat role=admin yoki is_superuser bo'lganlar uchun."""
    message = "Sizda admin huquqi yo'q"

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.role == "admin"))
