import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";

export default function Home() {
  redirect(hasSession() ? "/dashboard" : "/sign-in");
}
