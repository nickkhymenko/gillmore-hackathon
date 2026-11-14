import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Add a pet | Prevently" };

/** "Add another pet": the same onboarding, starting straight at the name. */
export default function AddPetPage() {
  return <Onboarding startNew />;
}
