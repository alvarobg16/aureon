import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type CalendarEvent, type Macrocycle, type Mesocycle, type Microcycle, type TeamGoal,
  TYPE_LABELS, INTENSITY_LABELS, LOAD_LABELS, STATUS_LABELS, PRIORITY_LABELS, GOAL_CATEGORIES,
} from "@/lib/planning";

type ReportInput = {
  teamName: string;
  seasonName: string;
  events: CalendarEvent[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  goals: TeamGoal[];
};

const ORANGE: [number, number, number] = [255, 122, 0];
const DARK: [number, number, number] = [22, 26, 34];

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function categoryLabel(v: string) {
  return GOAL_CATEGORIES.find((g) => g.value === v)?.label ?? v;
}

export function generatePlanningPdf(input: ReportInput): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 0;

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 70, pageWidth, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AUREON FUTSAL PRO SUITE", 40, 32);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Informe de Planificación", 40, 52);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }), pageWidth - 40, 52, { align: "right" });

  y = 100;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${input.teamName} · ${input.seasonName || "Sin temporada"}`, 40, y);
  y += 20;

  // ─── KPIs ───
  const total = input.events.length;
  const trainings = input.events.filter((e) => e.type === "training").length;
  const matches = input.events.filter((e) => e.type === "match").length;
  const rests = input.events.filter((e) => e.type === "rest").length;
  const goalsAchieved = input.goals.filter((g) => g.status === "achieved").length;
  const goalsTotal = input.goals.length;
  const compliance = goalsTotal > 0 ? Math.round((goalsAchieved / goalsTotal) * 100) : 0;

  autoTable(doc, {
    startY: y,
    head: [["Eventos", "Entrenamientos", "Partidos", "Descansos", "Objetivos", "% Cumplimiento"]],
    body: [[String(total), String(trainings), String(matches), String(rests), `${goalsAchieved}/${goalsTotal}`, `${compliance}%`]],
    theme: "grid",
    headStyles: { fillColor: ORANGE, textColor: 0, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 10, halign: "center" },
    styles: { cellPadding: 6 },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // ─── Macrociclos ───
  if (input.macrocycles.length) {
    sectionTitle(doc, "MACROCICLOS", y); y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Nombre", "Inicio", "Fin", "Objetivo"]],
      body: input.macrocycles.map((m) => [m.name, fmt(m.start_date), fmt(m.end_date), m.objective || "—"]),
      theme: "striped", headStyles: { fillColor: DARK, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 }, styles: { cellPadding: 5 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ─── Mesociclos ───
  if (input.mesocycles.length) {
    sectionTitle(doc, "MESOCICLOS", y); y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Nombre", "Inicio", "Fin", "Enfoque", "Carga"]],
      body: input.mesocycles.map((m) => [m.name, fmt(m.start_date), fmt(m.end_date), m.focus || "—", LOAD_LABELS[m.expected_load] ?? "—"]),
      theme: "striped", headStyles: { fillColor: DARK, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 }, styles: { cellPadding: 5 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ─── Microciclos ───
  if (input.microcycles.length) {
    if (y > 700) { doc.addPage(); y = 60; }
    sectionTitle(doc, "MICROCICLOS", y); y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Semana", "Objetivo semanal", "Carga prevista"]],
      body: input.microcycles.map((m) => [
        `${m.name} (${fmt(m.week_start)} → ${fmt(m.week_end)})`,
        m.weekly_objective || "—",
        LOAD_LABELS[m.planned_load] ?? "—",
      ]),
      theme: "striped", headStyles: { fillColor: DARK, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 }, styles: { cellPadding: 5 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ─── Objetivos ───
  if (input.goals.length) {
    if (y > 700) { doc.addPage(); y = 60; }
    sectionTitle(doc, "OBJETIVOS DE TEMPORADA", y); y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Categoría", "Título", "Prioridad", "Estado", "Meta"]],
      body: input.goals.map((g) => [
        categoryLabel(g.category), g.title, PRIORITY_LABELS[g.priority], STATUS_LABELS[g.status], g.target_value || "—",
      ]),
      theme: "striped", headStyles: { fillColor: DARK, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 }, styles: { cellPadding: 5 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ─── Próximos eventos ───
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = input.events
    .filter((e) => e.event_date >= today.toISOString().slice(0, 10))
    .slice(0, 30);
  if (upcoming.length) {
    if (y > 680) { doc.addPage(); y = 60; }
    sectionTitle(doc, "PRÓXIMOS EVENTOS", y); y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Hora", "Tipo", "Título", "Intensidad"]],
      body: upcoming.map((e) => [
        fmt(e.event_date), e.event_time ?? "—", TYPE_LABELS[e.type], e.title || "—",
        e.intensity ? INTENSITY_LABELS[e.intensity] : "—",
      ]),
      theme: "striped", headStyles: { fillColor: DARK, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 }, styles: { cellPadding: 5 },
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Página ${i} / ${pages} · Aureon Futsal Pro Suite`, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });
  }

  return doc;
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFillColor(...ORANGE);
  doc.rect(40, y - 10, 4, 12, "F");
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, 50, y);
}
