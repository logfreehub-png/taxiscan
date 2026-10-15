"use client";
import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminDriversPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Haydovchilar</h1>
        <p className="text-sm text-ink-muted">Barcha haydovchilarning ro'yxati va ma'lumotlari</p>
      </div>
      <UsersTable role="driver" />
    </div>
  );
}
