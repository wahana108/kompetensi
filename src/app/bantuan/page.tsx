"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSystemParameters } from "@/hooks/use-system-parameter";
import { canAccessAdmin, getPostLoginPath } from "@/lib/auth/roles";
import { DEFAULT_SYSTEM_PARAMETERS } from "@/lib/services/system-parameter";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function BantuanPage() {
  const { profile } = useAuth();
  const params = useSystemParameters();

  if (!profile) {
    return null;
  }

  const labelSkala = params.item?.labelSkala ?? DEFAULT_SYSTEM_PARAMETERS.labelSkala;
  const showAdminSection = canAccessAdmin(profile.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pusat Bantuan</h1>
          <p className="text-sm text-muted-foreground">
            Panduan singkat memakai sistem, disesuaikan dengan peran Anda.
          </p>
        </div>
        <Link
          href={getPostLoginPath(profile.role)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft />
          Kembali
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Untuk Pegawai</CardTitle>
          <CardDescription>Mengisi penilaian diri dan tes pengetahuan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <HelpItem title="Cara mengisi Self Assessment">
            <p>
              Buka menu <b>Penilaian Diri</b>, pilih periode yang sedang
              aktif, lalu klik <b>Isi Penilaian</b>. Anda akan melihat
              beberapa pernyataan — untuk tiap pernyataan, pilih angka 1
              sampai 5 sesuai kemampuan Anda saat ini (lihat arti angkanya
              di bawah). Jawaban tersimpan otomatis saat Anda mengisi, tapi
              baru terkirim resmi setelah Anda menekan tombol <b>Kirim</b>.
              Periksa dulu semua jawaban sebelum mengirim — setelah
              dikirim, jawaban terkunci dan tidak bisa diubah lagi.
            </p>
          </HelpItem>

          <HelpItem title="Apa itu Tes Pengetahuan?">
            <p>
              Tes Pengetahuan adalah kumpulan soal pilihan ganda yang{" "}
              <b>bersifat opsional</b> — boleh dilewati, tidak wajib
              dikerjakan. Kalau Anda memilih mengerjakannya, Anda{" "}
              <b>hanya bisa mengerjakan satu kali</b> per periode penilaian;
              setelah dikirim, tidak bisa diulang atau diubah. Hasilnya{" "}
              <b>tidak memengaruhi skor kompetensi Anda sama sekali</b> —
              murni jadi informasi tambahan untuk atasan.
            </p>
          </HelpItem>

          <HelpItem title="Arti skala 1-5">
            <ol className="list-decimal space-y-0.5 pl-5">
              {labelSkala.map((label, index) => (
                <li key={index}>
                  <b>{index + 1}</b> = {label}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-muted-foreground">
              Semakin besar angkanya, semakin mampu Anda merasa terhadap
              pernyataan tersebut. Pilih sejujur-jujurnya sesuai kondisi
              saat ini, bukan target yang ingin dicapai.
            </p>
          </HelpItem>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Untuk Atasan</CardTitle>
          <CardDescription>Menilai bawahan yang sudah mengisi Self Assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <HelpItem title="Cara menilai bawahan (3 dimensi)">
            <p>
              Buka menu <b>Penilaian Atasan</b> — daftar ini hanya berisi
              bawahan yang sudah mengisi Self Assessment-nya. Pilih satu
              nama, lalu beri skor 1-5 untuk tiga dimensi:{" "}
              <b>Pengetahuan</b>, <b>Keterampilan</b>, dan{" "}
              <b>Sikap Perilaku</b>. Anda bisa menyimpan sebagai draft dulu
              kalau belum selesai, atau langsung <b>Kirim</b> kalau sudah
              yakin. Setelah dikirim, penilaian terkunci.
            </p>
          </HelpItem>

          <HelpItem title="Cara mengisi usulan pelatihan">
            <p>
              Di halaman yang sama, ada kotak teks bebas untuk{" "}
              <b>usulan pelatihan</b> — boleh dikosongkan. Tulis rekomendasi
              pelatihan yang menurut Anda dibutuhkan bawahan tersebut,
              misalnya &ldquo;perlu pelatihan penyusunan laporan
              keuangan&rdquo;. Teks ini akan dibaca admin saat menyusun
              Rekap TNA (Training Needs Analysis) unit kerja.
            </p>
          </HelpItem>
        </CardContent>
      </Card>

      {showAdminSection ? (
        <Card>
          <CardHeader>
            <CardTitle>Memulai dari Nol (Setup Awal)</CardTitle>
            <CardDescription>
              Urutan pengisian data supaya tidak mentok karena
              ketergantungan antar-menu. Contoh memakai satu skenario yang
              sama dari awal sampai akhir: Balai Pelatihan Kesehatan
              Provinsi Nusantara.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-none space-y-5 text-sm">
              <SetupStep
                n={1}
                title="Parameter Sistem"
                why="Satu dokumen pengaturan global yang dipakai semua fitur lain (mode pendaftaran, domain email, skala nilai, logo). Isi ini duluan supaya nilai dasarnya sudah benar sebelum data lain dibuat."
                example={
                  <>
                    Nama instansi: <b>&ldquo;Balai Pelatihan Kesehatan Provinsi Nusantara&rdquo;</b>.
                    Mode pendaftaran: <b>Tertutup</b>. Domain email diizinkan:{" "}
                    <span className="font-mono">blk-nusantara.go.id</span>.
                    Logo boleh dikosongkan dulu, skala 1-5 bawaan sudah cukup
                    dipakai apa adanya.
                  </>
                }
              />

              <SetupStep
                n={2}
                title="Unit Kerja"
                why="Struktur organisasi paling dasar — TUSI dan Pengguna nanti ditautkan ke sini."
                example={
                  <>
                    <b>&ldquo;Seksi Penyelenggaraan Pelatihan&rdquo;</b> (kode:{" "}
                    <span className="font-mono">SEKSI-PENY</span>). Untuk mulai, satu unit kerja saja cukup — tidak perlu langsung membuat seluruh struktur organisasi.
                  </>
                }
                warning="Kode otomatis diubah jadi huruf besar dan harus unik antar unit kerja."
              />

              <SetupStep
                n={3}
                title="Jabatan"
                why="Standar Kompetensi dan penempatan Pengguna membutuhkan Jabatan yang sudah ada. Buat minimal 2 supaya ada jenjang atasan-bawahan untuk dites nanti."
                example={
                  <>
                    <b>&ldquo;Kepala Seksi Penyelenggaraan Pelatihan&rdquo;</b>{" "}
                    (eselon: IV) dan <b>&ldquo;Staf Pelaksana&rdquo;</b>{" "}
                    (eselon: -).
                  </>
                }
                warning="Form Jabatan belum punya kolom pilih Unit Kerja (field-nya ada di data tapi belum dipakai di form) — jangan bingung mencarinya, itu memang belum tersedia, bukan kesalahan Anda."
              />

              <SetupStep
                n={4}
                title="Pangkat / Golongan"
                why="Opsional — tidak memengaruhi Gap atau skor sama sekali, hanya kelengkapan data kepegawaian penempatan Pengguna."
                example={
                  <>
                    <b>&ldquo;Penata Muda&rdquo;</b> golongan{" "}
                    <span className="font-mono">III/a</span>.
                  </>
                }
                warning={
                  <>
                    Format golongan harus seperti{" "}
                    <span className="font-mono">III/a</span>, bukan{" "}
                    <span className="font-mono">3A</span> atau{" "}
                    <span className="font-mono">IIIa</span>.
                  </>
                }
              />

              <SetupStep
                n={5}
                title="TUSI (Tugas Pokok dan Fungsi)"
                why="Opsional. Kalau diisi dan ditautkan ke pegawai, Self Assessment akan memprioritaskan soal yang relevan dengan TUSI itu. Kalau dilewati, sistem otomatis memakai soal umum — tidak ada yang terblokir kalau langkah ini dilewati."
                example={
                  <>
                    <b>&ldquo;Verifikasi Dokumen Akreditasi Pelatihan&rdquo;</b>{" "}
                    — Unit Kerja: Seksi Penyelenggaraan Pelatihan, Jabatan:
                    Staf Pelaksana (opsional).
                  </>
                }
                warning="Beda dari Jabatan: Unit Kerja WAJIB dipilih di form TUSI karena field ini memang sudah dipakai."
              />

              <SetupStep
                n={6}
                title="Level Kompetensi"
                why="Skala global 1-5 yang dipakai semua Kompetensi. Opsional juga — kalau koleksi ini kosong, sistem otomatis pakai skala 1-5 bawaan. Diisi supaya nama levelnya tampil rapi di dropdown Standar Kompetensi."
                example="Pakai tombol isi otomatis (5 level bawaan: 1 Sangat Tidak Mampu ... 5 Sangat Mampu) — tidak perlu diketik manual."
              />

              <SetupStep
                n={7}
                title="Kompetensi"
                why="Dasar untuk Standar Kompetensi dan Bank Soal. Buat minimal 5 untuk cakupan yang wajar."
                example={
                  <ul className="list-disc space-y-0.5 pl-4">
                    <li>K1 — Penyusunan Kurikulum Pelatihan (Keterampilan)</li>
                    <li>K2 — Regulasi Akreditasi Pelatihan Kesehatan (Pengetahuan)</li>
                    <li>K3 — Pengelolaan Anggaran Kegiatan/DIPA (Keterampilan)</li>
                    <li>K4 — Komunikasi dengan Peserta dan Mitra (Keterampilan)</li>
                    <li>K5 — Kedisiplinan dan Tanggung Jawab (Sikap Perilaku)</li>
                  </ul>
                }
                warning="Isi kolom kode (K1, K2, dst) — kompetensi TANPA kode tidak bisa dipilih di halaman Impor Soal AI."
              />

              <SetupStep
                n={8}
                title="Standar Kompetensi"
                why="Butuh Jabatan (langkah 3) DAN Kompetensi (langkah 7) sudah ada — satu dokumen per jabatan berisi target level tiap kompetensi."
                example={
                  <>
                    Jabatan <b>Staf Pelaksana</b> → K1 level 3, K2 level 3, K3
                    level 2, K4 level 3, K5 level 4. Jabatan{" "}
                    <b>Kepala Seksi Penyelenggaraan Pelatihan</b> → semua
                    kompetensi level 4-5 (standar lebih tinggi untuk jabatan
                    pengawas).
                  </>
                }
                warning="Kalau jabatan seorang pegawai belum punya Standar Kompetensi sama sekali, Gap-nya TIDAK PERNAH terhitung — bukan error yang terlihat, kompetensinya cuma dilewati diam-diam dari hasil TNA."
              />

              <SetupStep
                n={9}
                title="Periode Penilaian"
                why={
                  <>
                    <b>Koreksi urutan dari daftar awal</b> — Periode
                    dipindah ke sini, SEBELUM Bank Soal, bukan sesudahnya.
                    Alasannya: soal pilihan ganda menyimpan kunci
                    jawabannya sambil menandai periode aktif SAAT ITU JUGA
                    — kalau belum ada periode aktif, menyimpan soal
                    pilihan ganda akan GAGAL dengan pesan &ldquo;Tidak ada
                    periode aktif&rdquo;.
                  </>
                }
                example={
                  <>
                    <b>&ldquo;Periode Penilaian 2026&rdquo;</b>, tahun 2026,
                    tanggal mulai-selesai mencakup hari ini, status{" "}
                    <b>Aktif</b>.
                  </>
                }
                warning="Hanya SATU periode boleh aktif dalam satu waktu — mengaktifkan periode baru otomatis menonaktifkan periode aktif sebelumnya."
              />

              <SetupStep
                n={10}
                title="Bank Soal (manual atau Impor AI)"
                why="Soal ditautkan ke Kompetensi (langkah 7). Buat minimal 2 soal per kompetensi supaya penilaian tidak terasa kosong."
                example={
                  <>
                    Soal likert untuk K1: &ldquo;Saya dapat menyusun
                    kurikulum pelatihan sesuai standar akreditasi dalam
                    waktu yang ditentukan.&rdquo; Untuk Impor AI: pilih
                    K1-K5, isi jumlah soal, dan isi kotak Konteks tambahan
                    (lihat contoh di bagian &ldquo;Cara memakai Impor Soal
                    AI&rdquo; di bawah).
                  </>
                }
                warning="Karena langkah 9 sudah dijalankan lebih dulu, menyimpan soal pilihan ganda di sini seharusnya sudah aman — kalau tetap muncul pesan 'Tidak ada periode aktif', cek lagi apakah periode di langkah 9 benar-benar berstatus Aktif."
              />

              <SetupStep
                n={11}
                title="Pengguna + supervisorId (atasan)"
                why="Butuh Unit Kerja (langkah 2) dan Jabatan (langkah 3) sudah ada untuk ditautkan. Buat minimal 1 pegawai yang punya atasan supaya alur Penilaian Atasan bisa dipakai/dites."
                example={
                  <>
                    <b>Andi Wijaya</b> — Jabatan: Kepala Seksi
                    Penyelenggaraan Pelatihan, Atasan: (kosong, paling
                    atas). <b>Siti Rahma</b> — Jabatan: Staf Pelaksana,
                    unit sama, Atasan: <b>Andi Wijaya</b>.
                  </>
                }
                warning={
                  <>
                    <b>Sumber kebingungan paling umum:</b> menu{" "}
                    <b>Penilaian Atasan</b> hanya muncul di akun seseorang
                    kalau ADA pegawai LAIN yang kolom &ldquo;Atasan&rdquo;
                    (supervisorId)-nya diarahkan ke akun itu. Field ini
                    diisi lewat halaman EDIT PROFIL BAWAHANNYA, bukan di
                    profil atasan sendiri — jadi untuk memunculkan menu itu
                    di akun Andi, admin harus membuka profil{" "}
                    <b>Siti</b> dan mengisi Atasan = Andi. Kalau menu itu
                    tidak muncul, itu bukan fitur yang rusak — cek dulu
                    apakah sudah ada bawahan yang menunjuk ke akun
                    tersebut.
                  </>
                }
              />

              <SetupStep
                n={12}
                title="Segarkan Kunci Jawaban"
                why="Jaring pengaman terakhir. Kalau urutan di atas diikuti (Periode sebelum Bank Soal), soal pilihan ganda yang baru dibuat sudah otomatis tertaut ke periode yang benar, jadi mungkin belum wajib dijalankan di setup awal ini. TAPI ini WAJIB jadi kebiasaan setiap kali periode BARU dibuka setelahnya (periode ke-2, ke-3, dst) — soal lama tidak otomatis ikut pindah periode."
                example="Buka Bank Soal — kalau ada peringatan kuning tentang kunci jawaban, klik 'Segarkan Kunci Jawaban'. Kalau tidak ada peringatan, tidak perlu diapa-apakan."
              />
            </ol>

            <div className="mt-5 rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <b>Minimal supaya sistem bisa langsung dipakai:</b> 1 Unit
              Kerja, 2 Jabatan, minimal 5 Kompetensi, Standar Kompetensi
              untuk KEDUA jabatan, minimal 2 soal per kompetensi, 1 Periode
              berstatus Aktif, dan minimal 1 pegawai yang punya atasan
              (kolom Atasan/supervisorId-nya terisi).
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showAdminSection ? (
        <Card>
          <CardHeader>
            <CardTitle>Untuk Admin</CardTitle>
            <CardDescription>
              Mengelola bank soal, parameter sistem, dan rekap TNA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <HelpItem title="Cara membuat soal pilihan ganda">
              <p>
                Di <b>Bank Soal → Tambah Soal</b>, pilih tipe{" "}
                <b>Pilihan Ganda</b>. Akan muncul beberapa baris opsi —{" "}
                <b>tiap baris punya kotak teks di sebelah kiri dan
                lingkaran radio di sebelah kanan</b>. Kotak teks itu berisi
                placeholder <span className="font-mono">&ldquo;Opsi 1&rdquo;</span>
                , <span className="font-mono">&ldquo;Opsi 2&rdquo;</span>, dan
                seterusnya — <b>itu bukan jawaban sungguhan, wajib Anda
                ganti</b> dengan bunyi jawaban yang sebenarnya sebelum
                disimpan. Klik lingkaran radio pada SATU baris yang
                jawabannya benar — itulah kunci jawabannya. Minimal 2 opsi,
                dan sebaiknya <b>posisi jawaban benar diacak antar soal</b>{" "}
                (jangan selalu opsi pertama/terakhir) supaya pegawai tidak
                bisa menebak pola tanpa benar-benar tahu jawabannya.
              </p>
            </HelpItem>

            <HelpItem title="Cara memakai Impor Soal AI">
              <p>
                Di <b>Bank Soal → Impor via AI</b>: Langkah 1 pilih
                kompetensi + tipe soal + jumlah, lalu klik{" "}
                <b>Salin Prompt</b>. Tempel prompt itu ke AI apa pun (mis.
                ChatGPT, Claude, Gemini), tempel balasannya di Langkah 2,
                lalu periksa pratinjau di Langkah 3 sebelum menyimpan.
              </p>
              <p>
                Kotak <b>&ldquo;Konteks tambahan&rdquo;</b> di Langkah 1
                sangat membantu supaya soal terasa nyata sesuai instansi
                Anda, bukan generik. Contoh isian:
              </p>
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
                &ldquo;Kami adalah Balai Pelatihan Kesehatan yang menangani
                akreditasi lembaga pelatihan, sertifikasi instruktur, dan
                pengelolaan anggaran DIPA. Istilah yang sering dipakai:
                SIAKPEL, e-monev, akreditasi lembaga pelatihan.&rdquo;
              </p>
            </HelpItem>

            <HelpItem title="Arti kolom Gap, Butuh Pelatihan, dan Validasi Tes">
              <p>
                <b>Gap</b> = selisih antara Standar (target level jabatan)
                dengan Skor Tercapai (gabungan penilaian diri + atasan).
                Makin besar Gap, makin jauh pegawai dari standar
                jabatannya. <b>Butuh Pelatihan</b> otomatis terisi
                &ldquo;Ya&rdquo; kalau Gap melewati ambang yang diatur di
                Parameter Sistem.
              </p>
              <p>
                <b>Validasi Tes</b> (Sesuai / Perlu Ditinjau) murni berasal
                dari hasil Tes Pengetahuan pegawai —{" "}
                <b>
                  tidak pernah ikut menghitung Gap atau Butuh Pelatihan
                </b>
                . &ldquo;Perlu Ditinjau&rdquo; artinya skor tes pegawai di
                bawah ambang yang ditentukan — <b>ini bukan berarti
                penilaian atasan/diri sendiri salah</b>, hanya bahan
                pertimbangan tambahan. Yang paling perlu diperhatikan
                atasan: kompetensi dengan Gap kecil (Butuh Pelatihan =
                Tidak) TAPI Validasi Tes &ldquo;Perlu Ditinjau&rdquo; —
                tandanya penilaian diri/atasan mungkin lebih optimis
                dibanding pengetahuan pegawai yang sebenarnya.
              </p>
            </HelpItem>

            <HelpItem title="Mode pendaftaran & domain email">
              <p>
                <b>Terbuka</b> = siapa saja boleh membuat akun sendiri
                (status awal &ldquo;pending&rdquo;, menunggu persetujuan
                admin). <b>Tertutup</b> = hanya email yang sudah diundang
                admin yang boleh mendaftar.
              </p>
              <p>
                Kolom <b>&ldquo;Domain email diizinkan&rdquo;</b> diisi{" "}
                <b>domain saja</b>, bukan alamat email lengkap. Contoh
                benar: <span className="font-mono">seed.test</span>. Contoh{" "}
                <b>salah</b>:{" "}
                <span className="font-mono">nama@seed.test</span>. Kosongkan
                kolom ini kalau semua domain email boleh mendaftar.
              </p>
            </HelpItem>

            <HelpItem title="Prosedur wajib: Segarkan Kunci Jawaban">
              <p className="rounded-md border border-amber-600/30 bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <b>Setiap membuka periode penilaian baru</b>, Super Admin
                WAJIB membuka <b>Bank Soal</b> dan menekan{" "}
                <b>&ldquo;Segarkan Kunci Jawaban&rdquo;</b> SEBELUM pegawai
                mulai mengerjakan Tes Pengetahuan. Kalau terlewat, semua
                kunci jawaban pilihan ganda masih menunjuk periode lama dan
                hasil tes pegawai tidak akan bisa dinilai. Halaman Bank
                Soal akan menampilkan peringatan otomatis kalau ini
                terlewat.
              </p>
            </HelpItem>

            <HelpItem title="Membuang & menghapus soal">
              <p>
                Soal yang tidak lagi dipakai bisa <b>Dibuang</b> ke Tong
                Sampah (bisa dipulihkan kapan saja) — berguna untuk
                membersihkan hasil Impor Soal AI yang kurang bagus. Dari
                Tong Sampah, Super Admin bisa <b>Hapus Permanen</b> — tapi
                hanya untuk soal yang <b>belum pernah dijawab siapa pun</b>;
                soal yang sudah pernah dijawab tidak bisa dihapus permanen
                (datanya perlu tetap ada untuk riwayat penilaian).
              </p>
            </HelpItem>
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <div className="space-y-1 py-2 text-center text-xs text-muted-foreground">
        <p>
          <Badge variant="outline" className="mb-1 font-normal">
            Tentang
          </Badge>
        </p>
        <p>Sistem Penilaian Kompetensi Pegawai &amp; TNA</p>
        <p>Versi 1.0 · 2026</p>
        <p>Dikembangkan oleh Sinta Javani &amp; Team</p>
        <p>Dibangun dengan Next.js, React, dan Firebase</p>
      </div>
    </div>
  );
}

function HelpItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-foreground">{title}</p>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </div>
  );
}

function SetupStep({
  n,
  title,
  why,
  example,
  warning,
}: {
  n: number;
  title: string;
  why: React.ReactNode;
  example: React.ReactNode;
  warning?: React.ReactNode;
}) {
  return (
    <li className="space-y-1.5">
      <p className="font-semibold text-foreground">
        {n}. {title}
      </p>
      <p className="text-muted-foreground">{why}</p>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground">
        {example}
      </div>
      {warning ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{warning}</span>
        </p>
      ) : null}
    </li>
  );
}
