"use client";

import Link from "next/link";
import { PetAvatar } from "./PetAvatar";
import { useTwin } from "@/lib/useTwin";

/** The pet's own avatar in the header once a Pet Twin exists. Renders nothing before that. */
export function HeaderAvatar() {
  const twin = useTwin();
  if (!twin) return null;
  return (
    <Link href="/twin" aria-label={`${twin.name || "Your pet"}'s Pet Twin`} className="fade-up -my-1 rounded-full">
      <PetAvatar traits={twin.profile} size={36} title={`${twin.name || "Your pet"}'s avatar`} />
    </Link>
  );
}
