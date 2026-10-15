import React from "react";
import { useAuth } from "@/store/auth";
import { PassengerHome } from "@/screens/PassengerHome";
import { DriverHome } from "@/screens/DriverHome";

export default function HomeTab() {
  const role = useAuth((s) => s.user?.role);
  if (role === "driver") return <DriverHome />;
  return <PassengerHome />;
}
