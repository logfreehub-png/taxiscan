"use client";
import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Yo'lovchilar</h1>
        <p className="text-sm text-ink-muted">Barcha yo'lovchilarning ro'yxati va ma'lumotlari</p>
      </div>
      <UsersTable role="passenger" />
    </div>
  );
}
