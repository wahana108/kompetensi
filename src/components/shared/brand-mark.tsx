"use client";

import { useState } from "react";
import { useSystemParameters } from "@/hooks/use-system-parameter";

/**
 * Blok identitas di sidebar admin/dashboard: logo + namaInstansi dari
 * system_parameters/global kalau terisi (kosong = fallback ke label
 * bawaan). onError menyembunyikan logo diam-diam kalau URL-nya rusak,
 * tidak pernah membuat layout pecah.
 */
export function BrandMark({ title }: { title: string }) {
  const params = useSystemParameters();
  const [logoError, setLogoError] = useState(false);
  const logoUrl = params.item?.logoUrl.trim();
  const namaInstansi = params.item?.namaInstansi.trim();

  return (
    <div className="flex min-w-0 items-center gap-2">
      {logoUrl && !logoError ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL bebas dari admin, tidak bisa di-allowlist untuk next/image
        <img
          src={logoUrl}
          alt=""
          className="size-7 shrink-0 rounded object-contain"
          onError={() => setLogoError(true)}
        />
      ) : null}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold tracking-tight">
          {title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {namaInstansi || "TNA Kompetensi"}
        </span>
      </span>
    </div>
  );
}
