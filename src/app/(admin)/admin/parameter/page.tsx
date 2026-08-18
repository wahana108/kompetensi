"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSystemParameters } from "@/hooks/use-system-parameter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_SYSTEM_PARAMETERS,
  mapSystemParameterError,
  saveSystemParameters,
} from "@/lib/services/system-parameter";
import type { ModePendaftaran, ModeValidasiTes } from "@/types";

export default function ParameterSistemPage() {
  const { profile } = useAuth();
  const params = useSystemParameters();

  const [bobotAtasan, setBobotAtasan] = useState("0.7");
  const [bobotSelf, setBobotSelf] = useState("0.3");
  const [ambangButuhPelatihan, setAmbangButuhPelatihan] = useState("1.0");
  const [skalaMaksimum, setSkalaMaksimum] = useState("5");
  const [labelSkala, setLabelSkala] = useState<string[]>(
    DEFAULT_SYSTEM_PARAMETERS.labelSkala
  );
  const [modePendaftaran, setModePendaftaran] =
    useState<ModePendaftaran>("tertutup");
  const [domainDiizinkan, setDomainDiizinkan] = useState("");
  const [namaInstansi, setNamaInstansi] = useState("");
  const [ambangValidasiTes, setAmbangValidasiTes] = useState("70");
  const [modeValidasiTes, setModeValidasiTes] =
    useState<ModeValidasiTes>("informasi");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.item) {
      return;
    }

    setBobotAtasan(String(params.item.bobotAtasan));
    setBobotSelf(String(params.item.bobotSelf));
    setAmbangButuhPelatihan(String(params.item.ambangButuhPelatihan));
    setSkalaMaksimum(String(params.item.skalaMaksimum));
    setLabelSkala(params.item.labelSkala);
    setModePendaftaran(params.item.modePendaftaran);
    setDomainDiizinkan(params.item.domainDiizinkan.join(", "));
    setNamaInstansi(params.item.namaInstansi);
    setAmbangValidasiTes(String(params.item.ambangValidasiTes));
    setModeValidasiTes(params.item.modeValidasiTes);
  }, [params.item]);

  function handleSkalaMaksimumChange(value: string) {
    setSkalaMaksimum(value);
    const count = Number(value);
    if (!Number.isInteger(count) || count < 1) {
      return;
    }

    setLabelSkala((current) => {
      const next = current.slice(0, count);
      while (next.length < count) {
        next.push("");
      }
      return next;
    });
  }

  function setLabelAt(index: number, value: string) {
    setLabelSkala((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  if (!profile) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setFormError(null);
    setPending(true);

    try {
      await saveSystemParameters(
        {
          bobotAtasan: Number(bobotAtasan),
          bobotSelf: Number(bobotSelf),
          ambangButuhPelatihan: Number(ambangButuhPelatihan),
          skalaMaksimum: Number(skalaMaksimum),
          labelSkala,
          modePendaftaran,
          domainDiizinkan: domainDiizinkan
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          namaInstansi,
          ambangValidasiTes: Number(ambangValidasiTes),
          modeValidasiTes,
        },
        profile.id
      );
      toast.success("Parameter sistem disimpan.");
      await params.reload();
    } catch (error) {
      const message = mapSystemParameterError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Parameter Sistem</CardTitle>
          <CardDescription>
            Satu dokumen global (system_parameters/global). Hanya Super Admin
            yang boleh menyimpan perubahan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          {params.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {params.error}
            </p>
          ) : null}

          <section className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Perhitungan Skor
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bobot-atasan">Bobot atasan</Label>
                <Input
                  id="bobot-atasan"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={bobotAtasan}
                  onChange={(event) => setBobotAtasan(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bobot-self">Bobot self</Label>
                <Input
                  id="bobot-self"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={bobotSelf}
                  onChange={(event) => setBobotSelf(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Bobot atasan + bobot self harus berjumlah 1.0.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ambang-pelatihan">
                  Ambang butuh pelatihan (gap)
                </Label>
                <Input
                  id="ambang-pelatihan"
                  type="number"
                  step="0.1"
                  min="0"
                  value={ambangButuhPelatihan}
                  onChange={(event) => setAmbangButuhPelatihan(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skala-maksimum">Skala maksimum</Label>
                <Input
                  id="skala-maksimum"
                  type="number"
                  step="1"
                  min="2"
                  value={skalaMaksimum}
                  onChange={(event) => handleSkalaMaksimumChange(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Label skala (level 1..{skalaMaksimum})</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {labelSkala.map((label, index) => (
                  <Input
                    key={index}
                    value={label}
                    placeholder={`Level ${index + 1}`}
                    onChange={(event) => setLabelAt(index, event.target.value)}
                    disabled={pending}
                    required
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Pendaftaran</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mode-pendaftaran">Mode pendaftaran</Label>
                <Select
                  value={modePendaftaran}
                  onValueChange={(value) => {
                    if (value === "terbuka" || value === "tertutup") {
                      setModePendaftaran(value);
                    }
                  }}
                  items={[
                    { value: "terbuka", label: "Terbuka (siapa pun boleh daftar)" },
                    { value: "tertutup", label: "Tertutup (perlu undangan)" },
                  ]}
                  disabled={pending}
                >
                  <SelectTrigger id="mode-pendaftaran" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terbuka">
                      Terbuka (siapa pun boleh daftar)
                    </SelectItem>
                    <SelectItem value="tertutup">
                      Tertutup (perlu undangan)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nama-instansi">Nama instansi</Label>
                <Input
                  id="nama-instansi"
                  value={namaInstansi}
                  onChange={(event) => setNamaInstansi(event.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="domain-diizinkan">
                  Domain email diizinkan (pisahkan koma, kosong = semua domain)
                </Label>
                <Textarea
                  id="domain-diizinkan"
                  value={domainDiizinkan}
                  onChange={(event) => setDomainDiizinkan(event.target.value)}
                  placeholder="blkkesehatan.go.id, instansi.go.id"
                  disabled={pending}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Validasi Tes (fitur berikutnya)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ambang-tes">Ambang validasi tes</Label>
                <Input
                  id="ambang-tes"
                  type="number"
                  step="1"
                  min="0"
                  value={ambangValidasiTes}
                  onChange={(event) => setAmbangValidasiTes(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mode-tes">Mode validasi tes</Label>
                <Select
                  value={modeValidasiTes}
                  onValueChange={(value) => {
                    if (value === "informasi" || value === "integrasi") {
                      setModeValidasiTes(value);
                    }
                  }}
                  items={[
                    { value: "informasi", label: "Informasi" },
                    { value: "integrasi", label: "Integrasi" },
                  ]}
                  disabled={pending}
                >
                  <SelectTrigger id="mode-tes" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informasi">Informasi</SelectItem>
                    <SelectItem value="integrasi">Integrasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending || params.loading}>
            {pending ? "Menyimpan..." : "Simpan Parameter"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
