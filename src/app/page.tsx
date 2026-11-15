export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink p-6 md:p-12">
      <div className="max-w-[560px] mx-auto flex flex-col gap-8">
        {/* Header Lembar Uji */}
        <header className="border-b-2 border-ink pb-4 flex justify-between items-end">
          <div>
            <p className="font-mono text-xs tracking-wider text-ink-2">
              DOKUMEN KALIBRASI SISTEM
            </p>
            <h1 className="font-display text-4xl font-bold mt-1 tracking-tight">
              Spesimen Bilik
            </h1>
          </div>
          <span className="font-mono text-xs border-2 border-ink px-2 py-1 bg-paper-2 shadow-[2px_2px_0_var(--ink)]">
            No. 0021-T02
          </span>
        </header>

        {/* Seksi Tipografi */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b-2 border-dashed border-ink/40 pb-1">
            <span className="font-mono text-xs bg-ink text-paper px-1.5 py-0.5">
              01
            </span>
            <h2 className="font-mono text-xs font-bold tracking-wider">
              TIPOGRAFI (3 KELUARGA FONT)
            </h2>
          </div>

          <div className="bg-paper-2 border-2 border-ink p-4 shadow-[4px_4px_0_var(--ink)] flex flex-col gap-3">
            <div>
              <span className="font-mono text-[10px] text-ink-2 uppercase block mb-1">
                Display — Fraunces (600–900)
              </span>
              <p className="font-display text-3xl font-bold leading-tight">
                Foto strip, tanpa jejak.
              </p>
            </div>

            <div className="border-t-2 border-ink/20 pt-3">
              <span className="font-mono text-[10px] text-ink-2 uppercase block mb-1">
                Body & UI — Archivo (400/500/700)
              </span>
              <p className="font-body text-base text-ink leading-relaxed">
                Pengalaman bilik fisik: tirai tertutup, kilatan lampu, dan strip foto
                yang keluar perlahan dari celah mesin.
              </p>
            </div>

            <div className="border-t-2 border-ink/20 pt-3">
              <span className="font-mono text-[10px] text-ink-2 uppercase block mb-1">
                Mono — IBM Plex Mono (400/500)
              </span>
              <p className="font-mono text-sm text-ink-2">
                SLOT: 03/06 • ISO 400 • EXPOSURE: +0.0 • 1200×3600 PX
              </p>
            </div>
          </div>
        </section>

        {/* Seksi Palet Warna */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b-2 border-dashed border-ink/40 pb-1">
            <span className="font-mono text-xs bg-ink text-paper px-1.5 py-0.5">
              02
            </span>
            <h2 className="font-mono text-xs font-bold tracking-wider">
              PALET WARNA (TOKEN RESMI)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Paper */}
            <div className="border-2 border-ink bg-paper p-3 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-mono text-xs block font-bold text-ink">
                --paper
              </span>
              <span className="font-body text-xs text-ink-2 block mt-1">
                Latar Utama
              </span>
            </div>

            {/* Paper-2 */}
            <div className="border-2 border-ink bg-paper-2 p-3 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-mono text-xs block font-bold text-ink">
                --paper-2
              </span>
              <span className="font-body text-xs text-ink-2 block mt-1">
                Kartu & Permukaan
              </span>
            </div>

            {/* Ink */}
            <div className="border-2 border-ink bg-ink text-paper p-3 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-mono text-xs block font-bold text-paper">
                --ink
              </span>
              <span className="font-body text-xs text-paper-2 block mt-1">
                Tinta & Garis
              </span>
            </div>

            {/* Booth Red */}
            <div className="border-2 border-ink bg-booth-red text-paper p-3 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-mono text-xs block font-bold text-paper">
                --booth-red
              </span>
              <span className="font-body text-xs text-paper block mt-1">
                Aksen Utama & CTA
              </span>
            </div>

            {/* Curtain */}
            <div className="border-2 border-ink bg-curtain text-paper p-3 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-mono text-xs block font-bold text-paper">
                --curtain
              </span>
              <span className="font-body text-xs text-paper-2 block mt-1">
                Tirai Bilik
              </span>
            </div>

            {/* Flash */}
            <div className="border-2 border-ink bg-flash text-ink p-3 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-mono text-xs block font-bold text-ink">
                --flash
              </span>
              <span className="font-body text-xs text-ink-2 block mt-1">
                Kilatan Rana
              </span>
            </div>
          </div>
        </section>

        {/* Seksi Komponen Tombol Uji */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b-2 border-dashed border-ink/40 pb-1">
            <span className="font-mono text-xs bg-ink text-paper px-1.5 py-0.5">
              03
            </span>
            <h2 className="font-mono text-xs font-bold tracking-wider">
              BENTUK & BAYANGAN KERAS
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="h-12 px-6 bg-booth-red text-paper font-body font-bold text-sm border-2 border-ink shadow-[4px_4px_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--ink)] transition-transform"
            >
              Tombol Utama (CTA)
            </button>
            <button
              type="button"
              className="h-12 px-6 bg-paper-2 text-ink font-body font-medium text-sm border-2 border-ink shadow-[4px_4px_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--ink)] transition-transform"
            >
              Tombol Sekunder
            </button>
          </div>
        </section>

        {/* Footer info */}
        <footer className="pt-4 border-t-2 border-ink flex justify-between items-center font-mono text-[11px] text-ink-2">
          <span>STATUS: TERVERIFIKASI</span>
          <span>BILIK ANALOG © 2026</span>
        </footer>
      </div>
    </main>
  );
}
