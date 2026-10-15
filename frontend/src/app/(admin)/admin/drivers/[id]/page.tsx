"use client";
import { use } from "react";
import { UserDetail } from "@/components/admin/UserDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <UserDetail id={id} backHref="/admin/drivers" />;
}
