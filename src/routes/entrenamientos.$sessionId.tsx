import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Printer, ArrowLeft, Eye, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BLOCK_LABELS, BLOCK_ORDER, type TrainingBlock } from "@/lib/training";
import { categoryStyle, formatTaskNumber } from "@/lib/tasks";

export const Route = createFileRoute("/entrenamientos/$sessionId")({
  validateSearch: (s: Record<string, unknown>): { print?: string } => ({ print: typeof s.print === "string" ? s.print : undefined }),
  head: () => ({ meta: [{ title: "Sesión de entrenamiento — Aureon Futsal Pro Suite" }] }),
  component: SessionView,
});

type Session = {
  id: string; team_id: string; session_date: string | null; session_time: string;
  venue: string; competitive_period: string; microcycle: string; session_number: string;
  rival: string; objectives: string; other_notes: string;
};
type Team = { id: string; name: string; category: string };
type Player = { id: string; first_name: string; last_name: string; sport_name: string; jersey_number: number | null };
type SessionTask = { id: string; task_id: string; block: TrainingBlock; order_index: number };
type SessionText = { id: string; content: string; block: TrainingBlock; order_index: number };
type Att = { player_id: string; present: boolean };
type TaskRow = { id: string; task_number: number; keywords: string; description: string; category: string; image_url: string | null };

function SessionView() {
  const { sessionId } = Route.useParams();
  const search = Route.useSearch();
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId.endsWith("/editar"));
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [tasks, setTasks] = useState<SessionTask[]>([]);
  const [texts, setTexts] = useState<SessionText[]>([]);
  const [tasksDb, setTasksDb] = useState<Record<string, TaskRow>>({});
  const [att, setAtt] = useState<Att[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewOpen) return;
    const check = () => {
      const el = sheetRef.current;
      if (!el) return;
      // 1px tolerance
      setOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    const id = setTimeout(check, 50);
    window.addEventListener("resize", check);
    return () => { clearTimeout(id); window.removeEventListener("resize", check); };
  }, [previewOpen, tasks, texts, att, session]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("training_sessions").select("*").eq("id", sessionId).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSession(s as Session);
      const [{ data: t }, { data: st }, { data: stx }, { data: a }] = await Promise.all([
        supabase.from("teams").select("id,name,category").eq("id", s.team_id).maybeSingle(),
        supabase.from("training_session_tasks").select("*").eq("session_id", sessionId).order("order_index"),
        (supabase as any).from("training_session_texts").select("*").eq("session_id", sessionId).order("order_index"),
        supabase.from("training_attendance").select("player_id,present").eq("session_id", sessionId),
      ]);
      setTeam((t as Team) ?? null);
      const stRows = (st as SessionTask[]) ?? [];
      setTasks(stRows);
      setTexts(((stx as any[]) ?? []) as SessionText[]);
      const attRows = (a as Att[]) ?? [];
      setAtt(attRows);

      const taskIds = stRows.map(x => x.task_id);
      const playerIds = attRows.map(x => x.player_id);
      if (taskIds.length > 0) {
        const { data: td } = await supabase.from("tasks").select("id,task_number,keywords,description,category,image_url").in("id", taskIds);
        const m: Record<string, TaskRow> = {};
        (td ?? []).forEach((r: any) => { m[r.id] = r; });
        setTasksDb(m);
      }
      if (playerIds.length > 0) {
        const { data: pd } = await supabase.from("players").select("id,first_name,last_name,sport_name,jersey_number").in("id", playerIds);
        const m: Record<string, Player> = {};
        (pd ?? []).forEach((r: any) => { m[r.id] = r; });
        setPlayers(m);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  useEffect(() => {
    if (search.print === "1" && !loading && session) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [search.print, loading, session]);

  if (isChild) return <Outlet />;
  if (loading) return <ModuleShell title="ENTRENAMIENTO"><p className="text-muted-foreground">Cargando…</p></ModuleShell>;
  if (!session) return <ModuleShell title="ENTRENAMIENTO"><p className="text-muted-foreground">Sesión no encontrada.</p></ModuleShell>;

  const presentes = att.filter(a => a.present);
  const ausentes = att.filter(a => !a.present);
  const fmtPlayer = (pid: string) => {
    const p = players[pid];
    if (!p) return "—";
    const name = p.sport_name || `${p.first_name} ${p.last_name}`.trim();
    return `#${p.jersey_number ?? "—"} ${name}`;
  };
  const presentesStr = presentes.map(a => fmtPlayer(a.player_id)).join(", ");
  const ausentesStr = ausentes.map(a => fmtPlayer(a.player_id)).join(", ");

  // Compact header chips
  const headerLine1: Array<[string, string]> = [];
  if (session.session_number) headerLine1.push(["Sesión", `Nº ${session.session_number}`]);
  if (session.competitive_period) headerLine1.push(["Periodo", session.competitive_period]);
  if (session.microcycle) headerLine1.push(["Microciclo", session.microcycle]);
  if (session.session_date) headerLine1.push(["Fecha", session.session_date]);
  if (session.session_time) headerLine1.push(["Hora", session.session_time]);

  const headerLine2: Array<[string, string]> = [];
  if (team?.category) headerLine2.push(["Categoría", team.category]);
  if (team?.name) headerLine2.push(["Equipo", team.name]);
  if (session.venue) headerLine2.push(["Pabellón", session.venue]);
  if (session.rival) headerLine2.push(["Rival", session.rival]);

  const printBody = (
    <>
      <header className="border border-border/60 rounded-lg p-2 text-[12px] leading-tight print:border-black/30 print:rounded-none print:p-1.5">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {headerLine1.map(([k, v]) => (
            <span key={k}><span className="text-muted-foreground print:text-black/60">{k}:</span> <span className="font-medium">{v}</span></span>
          ))}
        </div>
        {headerLine2.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {headerLine2.map(([k, v]) => (
              <span key={k}><span className="text-muted-foreground print:text-black/60">{k}:</span> <span className="font-medium">{v}</span></span>
            ))}
          </div>
        )}
        {session.objectives && (
          <div className="mt-0.5"><span className="text-muted-foreground print:text-black/60">Objetivos:</span> <span className="font-medium">{session.objectives}</span></div>
        )}
      </header>

      {(presentes.length > 0 || ausentes.length > 0) && (
        <section className="text-[12px] leading-snug">
          {presentes.length > 0 && (
            <p><span className="font-display tracking-wider text-muted-foreground print:text-black/70">ASISTENTES ({presentes.length}):</span> {presentesStr}</p>
          )}
          {ausentes.length > 0 && (
            <p className="mt-0.5"><span className="font-display tracking-wider text-muted-foreground print:text-black/70">AUSENTES ({ausentes.length}):</span> {ausentesStr}</p>
          )}
        </section>
      )}

      {BLOCK_ORDER.map(block => {
        type Merged =
          | { kind: "task"; id: string; order_index: number; task_id: string }
          | { kind: "text"; id: string; order_index: number; content: string };
        const items: Merged[] = [
          ...tasks.filter(t => t.block === block).map(t => ({ kind: "task" as const, id: t.id, order_index: t.order_index, task_id: t.task_id })),
          ...texts.filter(t => t.block === block).map(t => ({ kind: "text" as const, id: t.id, order_index: t.order_index, content: t.content })),
        ].sort((a, b) => a.order_index - b.order_index);
        if (items.length === 0) return null;
        return (
          <section key={block} className="block-section">
            <h3 className="font-display tracking-wider text-[12px] mb-1 border-b border-border/60 pb-0.5 print:border-black/40">{BLOCK_LABELS[block].toUpperCase()}</h3>
            <ol className="space-y-1">
              {items.map((it, i) => {
                if (it.kind === "text") {
                  return (
                    <li key={it.id} className="flex gap-2 items-start rounded border border-border/60 px-2 py-1 bg-aureon-blue/5 text-[11px] print:border-black/30 print:bg-transparent">
                      <span className="font-display text-[11px] w-5 shrink-0">{i + 1}.</span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-aureon-blue/15 text-aureon-blue shrink-0 print:bg-transparent print:border print:border-black/40 print:text-black">Texto</span>
                      <p className="flex-1 whitespace-pre-wrap leading-snug">{it.content || "—"}</p>
                    </li>
                  );
                }
                const t = tasksDb[it.task_id];
                return (
                  <li key={it.id} className="flex gap-2 items-start rounded border border-border/60 px-2 py-1 text-[11px] print:border-black/30 break-inside-avoid">
                    <span className="font-display text-[11px] w-5 shrink-0">{i + 1}.</span>
                    {t && (
                      <>
                        {t.image_url && (
                          <img src={t.image_url} alt="" className="w-20 h-auto max-h-24 object-contain rounded border border-border/60 bg-white shrink-0 print:w-24 print:max-h-28" />
                        )}
                        <span className="font-display text-[10px] text-muted-foreground w-10 shrink-0 print:text-black/60">#{formatTaskNumber(t.task_number)}</span>
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${categoryStyle(t.category)} print:bg-transparent print:border print:border-black/40 print:text-black`}>{t.category}</span>
                        <span className="flex-1 leading-snug">
                          <span className="font-medium">{t.keywords || "Tarea"}</span>
                          {t.description && <span className="block text-muted-foreground text-[10px] mt-0.5 whitespace-pre-wrap print:text-black/70">{t.description}</span>}
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {session.other_notes && (
        <section className="text-[11px]">
          <h3 className="font-display tracking-wider text-[12px] mb-1 border-b border-border/60 pb-0.5 print:border-black/40">OTROS ASUNTOS RELEVANTES</h3>
          <p className="whitespace-pre-wrap leading-snug">{session.other_notes}</p>
        </section>
      )}
    </>
  );

  return (
    <ModuleShell
      title={`SESIÓN${session.session_number ? ` Nº ${session.session_number}` : ""}`}
      subtitle={team?.name}
      actions={
        <div className="flex gap-2 print:hidden">
          <Link to="/entrenamientos" className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md bg-white text-black hover:bg-white/90">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <Button onClick={() => setPreviewOpen(true)} variant="outline" className="border-aureon-blue/40 text-aureon-blue hover:bg-aureon-blue/10">
            <Eye className="w-4 h-4 mr-1" /> Vista previa A4
          </Button>
          <Button onClick={() => window.print()} className="bg-aureon-blue text-white hover:brightness-110">
            <Printer className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Link to="/entrenamientos/$sessionId/editar" params={{ sessionId }}
            className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md bg-amber-500 text-black hover:brightness-110">
            <Pencil className="w-4 h-4" /> Editar
          </Link>
        </div>
      }
    >
      <div className="print-area space-y-3 bg-card text-foreground rounded-2xl border border-border/60 p-6 shadow-card print:space-y-2 print:p-0 print:bg-white print:rounded-none print:border-0 print:shadow-none">
        {printBody}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex flex-col items-center overflow-auto py-6 print:hidden">
          <div className="w-full max-w-[230mm] flex items-center justify-between px-4 mb-3 text-white">
            <div className="flex items-center gap-2 text-sm">
              {overflow ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/90 text-black">
                  <AlertTriangle className="w-4 h-4" /> El contenido excede una hoja A4
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/90 text-black">
                  <CheckCircle2 className="w-4 h-4" /> Cabe en una hoja A4
                </span>
              )}
              <span className="opacity-80">Vista previa A4 — 210 × 297 mm</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.print()} className="bg-aureon-blue text-white hover:brightness-110">
                <Printer className="w-4 h-4 mr-1" /> Descargar PDF
              </Button>
              <Button onClick={() => setPreviewOpen(false)} variant="outline" className="bg-white text-black">
                <X className="w-4 h-4 mr-1" /> Cerrar
              </Button>
            </div>
          </div>
          <div
            ref={sheetRef}
            className="a4-sheet print-area bg-white text-black shadow-2xl"
            style={{
              width: "210mm",
              height: "297mm",
              padding: "8mm 10mm",
              overflow: "hidden",
              fontSize: "10.5pt",
              boxSizing: "border-box",
            }}
          >
            {printBody}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm 10mm; }
          html, body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; color: #000 !important; font-size: 10.5pt; }
          .print-area * { color: inherit; }
          .block-section { break-inside: avoid; page-break-inside: avoid; }
          .print-area li { break-inside: avoid; page-break-inside: avoid; }
          .print-area h3 { break-after: avoid; page-break-after: avoid; }
        }
        .a4-sheet { color: #000; }
        .a4-sheet .text-muted-foreground { color: rgba(0,0,0,0.6) !important; }
        .a4-sheet .bg-card { background: white !important; }
        .a4-sheet .border-border\\/60 { border-color: rgba(0,0,0,0.25) !important; }
      `}</style>
    </ModuleShell>
  );
}
