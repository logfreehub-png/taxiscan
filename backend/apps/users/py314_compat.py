"""
Python 3.14 + Django 5.1 mosligini tuzatuvchi shim.

Muammo: Python 3.14 da `copy(super())` endi instance nusxasini emas, `super`
obyektini qaytaradi. Django 5.1 ning `BaseContext.__copy__` metodi shunga
tayanadi va admin (changelist_view) da xato beradi:
    'super' object has no attribute 'dicts' and no __dict__ ...

Yechim: `__copy__` ni instance-ni to'g'ri sayoz (shallow) nusxalaydigan qilib
almashtiramiz. Server Python 3.12 da ishlagani uchun bu faqat 3.14+ da yoqiladi
(3.12/3.13 da hech narsa o'zgarmaydi).
"""
import sys


def apply() -> None:
    if sys.version_info < (3, 14):
        return
    from django.template.context import BaseContext

    # Ikki marta patch qilmaslik uchun belgi
    if getattr(BaseContext.__copy__, "_py314_patched", False):
        return

    def __copy__(self):
        duplicate = self.__class__.__new__(self.__class__)
        duplicate.__dict__ = self.__dict__.copy()
        duplicate.dicts = self.dicts[:]
        return duplicate

    __copy__._py314_patched = True
    BaseContext.__copy__ = __copy__
