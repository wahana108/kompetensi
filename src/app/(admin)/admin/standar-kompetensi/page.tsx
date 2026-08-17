"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useStandarKompetensi } from "@/hooks/use-standar-kompetensi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getKompetensiDimensiLabel } from "@/lib/services/kompetensi";
import {
  LEVEL_STANDAR_MAX,
  LEVEL_STANDAR_MIN,
  mapStandarKompetensiError,
  saveStandarKompetensi,
} from "@/lib/services/standar-kompetensi";

const NO_JABATAN_VALUE = "__none__";
const UNSET_LEVEL_VALUE = "__unset__";
const LEVEL_OPTIONS = Array.from(
  { length: LEVEL_STANDAR_MAX - LEVEL_STANDAR_MIN + 1 },
  (_, index) => LEVEL_STANDAR_MIN + index
);

export default function StandarKompetensiPage() {
  const { profile } = useAuth();
  const jabatan = useJabatanList();
  const kompetensi = useKompetensiList();
  const [jabatanId, setJabatanId] = useState<string | null>(null);
  const standar = useStandarKompetensi(jabatanId);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const item of standar.item?.items ?? []) {
      next[item.kompetensiId] = item.levelStandar;
    }
    setLevels(next);
  }, [standar.item]);

  const activeKompetensi = useMemo(
    () => kompetensi.items.filter((item) => item.isActive),
    [kompetensi.items]
  );

  function setLevel(kompetensiId: string, value: string | null) {
    setLevels((current) => {
      if (!value || value === UNSET_LEVEL_VALUE) {
        const next = { ...current };
        delete next[kompetensiId];
        return next;
      }

      return { ...current, [kompetensiId]: Number(value) };
    });
  }

  async function handleSave() {
    if (!profile || !jabatanId) {
      return;
    }

    setPending(true);

    try {
      await saveStandarKompetensi(
        jabatanId,
        Object.entries(levels).map(([kompetensiId, levelStandar]) => ({
          kompetensiId,
          levelStandar,
        })),
        profile.id
      );
      toast.success("Standar kompetensi disimpan.");
      await standar.reload();
    } catch (error) {
      toast.error(mapStandarKompetensiError(error));
    } finally {
      setPending(false);
    }
  }

  const loading = jabatan.loading || kompetensi.loading;
  const error = jabatan.error ?? kompetensi.error ?? standar.error;
  const filledCount = Object.keys(levels).length;
  const jabatanItems = jabatan.items.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Standar Kompetensi</CardTitle>
          <CardDescription>
            Level target per kompetensi untuk satu jabatan. Kompetensi yang
            dibiarkan &quot;Belum diatur&quot; dianggap tidak punya standar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="standar-jabatan">Jabatan</Label>
            <Select
              value={jabatanId ?? NO_JABATAN_VALUE}
              onValueChange={(value) =>
                setJabatanId(value === NO_JABATAN_VALUE ? null : value)
              }
              items={[
                { value: NO_JABATAN_VALUE, label: "Pilih jabatan..." },
                ...jabatanItems,
              ]}
              disabled={jabatan.loading}
            >
              <SelectTrigger id="standar-jabatan" className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                <SelectItem value={NO_JABATAN_VALUE}>
                  Pilih jabatan...
                </SelectItem>
                {jabatanItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {!jabatanId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pilih jabatan untuk mengatur standar kompetensinya.
            </p>
          ) : loading || standar.loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data...
            </p>
          ) : activeKompetensi.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada kompetensi aktif. Tambahkan dulu di menu Kompetensi.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {filledCount} dari {activeKompetensi.length} kompetensi punya
                level standar.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kompetensi</TableHead>
                    <TableHead>Dimensi</TableHead>
                    <TableHead className="w-48">Level standar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKompetensi.map((item) => {
                    const value = levels[item.id];
                    const selectValue =
                      value !== undefined ? String(value) : UNSET_LEVEL_VALUE;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {item.name}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getKompetensiDimensiLabel(item.dimensi)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={selectValue}
                            onValueChange={(next) => setLevel(item.id, next)}
                            items={[
                              { value: UNSET_LEVEL_VALUE, label: "Belum diatur" },
                              ...LEVEL_OPTIONS.map((level) => ({
                                value: String(level),
                                label: `Level ${level}`,
                              })),
                            ]}
                            disabled={pending}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNSET_LEVEL_VALUE}>
                                Belum diatur
                              </SelectItem>
                              {LEVEL_OPTIONS.map((level) => (
                                <SelectItem key={level} value={String(level)}>
                                  Level {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
        {jabatanId && activeKompetensi.length > 0 ? (
          <CardFooter className="justify-end">
            <Button
              type="button"
              disabled={pending}
              onClick={() => void handleSave()}
            >
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
