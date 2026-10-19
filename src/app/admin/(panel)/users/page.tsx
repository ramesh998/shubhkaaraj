import type { Metadata } from "next";
import { UsersManager } from "@/components/admin/users";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <UsersManager />;
}
