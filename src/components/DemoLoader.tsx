"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { seedDemoPet, type DemoId } from "@/lib/demo";
import { toast } from "@/lib/toast";

/** `?demo=biscuit` or `?demo=miso` on any page loads a fully populated demo pet, then tidies the URL. */
export function DemoLoader() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo !== "biscuit" && demo !== "miso") return;
    const rec = seedDemoPet(demo as DemoId);
    toast(`Demo pet loaded: ${rec.pet.name}. Your own pets are untouched.`);
    router.replace(pathname === "/" ? "/dashboard" : pathname);
  }, [router, pathname]);
  return null;
}
