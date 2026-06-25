import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/lib/settings";
import { toast } from "sonner";
import { Lock, Upload, RotateCcw, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { MODULE_TREE, loadEnabledModules, saveEnabledModules, type ModuleNode } from "@/lib/modules";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Aureon Futsal Pro Suite" },
      { name: "description", content: "Personaliza el logotipo, colores y textos de la plataforma." },
    ],
  }),
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  const { settings, update, reset } = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [draft, setDraft] = useState(settings);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!unlocked) {
    return (
      <ModuleShell title="CONFIGURACIÓN" subtitle="Acceso restringido">
        <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8 text-center">
          <Lock className="w-10 h-10 mx-auto text-aureon-orange" />
          <h2 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">Introduce la contraseña</h2>
          <p className="mt-1 text-sm text-muted-foreground">Por defecto: <code className="text-white/80">admin</code></p>
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (pwd === settings.adminPassword) {
                setUnlocked(true);
                setDraft(settings);
              } else {
                toast.error("Contraseña incorrecta");
              }
            }}
          >
            <Input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Contraseña"
              className="bg-background/50 border-white/20 text-white"
            />
            <Button type="submit" className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
              Acceder
            </Button>
          </form>
        </div>
      </ModuleShell>
    );
  }

  const handleLogo = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe ser menor de 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({ ...d, logoDataUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    update(draft);
    toast.success("Configuración guardada");
  };

  return (
    <ModuleShell
      title="CONFIGURACIÓN"
      subtitle="Personalización de la plataforma"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { reset(); setDraft({ ...settings }); toast.success("Restaurado"); }}>
            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar
          </Button>
          <Button onClick={save} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
            <Save className="w-4 h-4 mr-2" /> Guardar
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logo */}
        <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-6">
          <h2 className="font-display text-xl tracking-[0.1em] text-white">LOGOTIPO INICIO</h2>
          <p className="mt-1 text-xs text-muted-foreground">Imagen mostrada en la pantalla de bienvenida.</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="w-28 h-28 rounded-xl border border-white/15 bg-background/50 flex items-center justify-center overflow-hidden">
              {draft.logoDataUrl ? (
                <img src={draft.logoDataUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Sin logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogo(f);
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Subir imagen
              </Button>
              {draft.logoDataUrl && (
                <Button variant="ghost" onClick={() => setDraft((d) => ({ ...d, logoDataUrl: null }))}>
                  Quitar logo
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Textos */}
        <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-6">
          <h2 className="font-display text-xl tracking-[0.1em] text-white">TEXTOS</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Título línea 1" value={draft.heroTitleLine1} onChange={(v) => setDraft({ ...draft, heroTitleLine1: v })} />
            <Field label="Título línea 2" value={draft.heroTitleLine2} onChange={(v) => setDraft({ ...draft, heroTitleLine2: v })} />
            <Field label="Texto botón principal" value={draft.ctaText} onChange={(v) => setDraft({ ...draft, ctaText: v })} />
            <Field label="Pie de página" value={draft.footerText} onChange={(v) => setDraft({ ...draft, footerText: v })} />
          </div>
        </section>

        {/* Colores */}
        <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-6 lg:col-span-2">
          <h2 className="font-display text-xl tracking-[0.1em] text-white">COLORES</h2>
          <p className="mt-1 text-xs text-muted-foreground">Usa formato CSS válido (oklch, hex, rgb…). Se aplican como variables globales.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField label="Azul" value={draft.colorBlue} onChange={(v) => setDraft({ ...draft, colorBlue: v })} />
            <ColorField label="Naranja" value={draft.colorOrange} onChange={(v) => setDraft({ ...draft, colorOrange: v })} />
            <ColorField label="Rojo" value={draft.colorRed} onChange={(v) => setDraft({ ...draft, colorRed: v })} />
            <ColorField label="Fondo (arriba)" value={draft.bgFrom} onChange={(v) => setDraft({ ...draft, bgFrom: v })} />
            <ColorField label="Fondo (abajo)" value={draft.bgTo} onChange={(v) => setDraft({ ...draft, bgTo: v })} />
          </div>
        </section>

        {/* Seguridad */}
        <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-6 lg:col-span-2">
          <h2 className="font-display text-xl tracking-[0.1em] text-white">SEGURIDAD</h2>
          <div className="mt-4 max-w-md">
            <Field label="Contraseña de configuración" value={draft.adminPassword} onChange={(v) => setDraft({ ...draft, adminPassword: v })} />
            <p className="mt-2 text-xs text-muted-foreground">Cambia la contraseña por defecto (admin) para proteger este panel.</p>
          </div>
        </section>

        {/* Módulos */}
        <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-6 lg:col-span-2">
          <h2 className="font-display text-xl tracking-[0.1em] text-white">MÓDULOS</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Habilita o deshabilita los módulos y sub-módulos para este cliente. Los cambios se aplican al instante.
          </p>
          <ModulesTree />
        </section>
      </div>
    </ModuleShell>
  );
}

function ModulesTree() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => loadEnabledModules());

  useEffect(() => {
    const handler = () => setEnabled(loadEnabledModules());
    window.addEventListener("aureon:modules-changed", handler);
    return () => window.removeEventListener("aureon:modules-changed", handler);
  }, []);

  const toggle = (key: string) => {
    const next = { ...enabled, [key]: !(enabled[key] !== false) };
    setEnabled(next);
    saveEnabledModules(next);
    toast.success(next[key] ? "Módulo habilitado" : "Módulo deshabilitado");
  };

  const Row = ({ node, depth = 0 }: { node: ModuleNode; depth?: number }) => {
    const on = enabled[node.key] !== false;
    return (
      <>
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/40 px-3 py-2 mt-2`}
          style={{ marginLeft: depth * 20 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {depth > 0 && <span className="text-white/40 text-xs">└</span>}
            <span className={`font-display tracking-[0.15em] text-sm ${on ? "text-white" : "text-white/40 line-through"}`}>
              {node.label}
            </span>
            {node.to && <code className="text-[10px] text-muted-foreground">{node.to}</code>}
          </div>
          <Button
            size="sm"
            onClick={() => toggle(node.key)}
            className={`h-8 px-3 text-xs ${on ? "bg-aureon-orange text-black hover:bg-aureon-orange/90" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            {on ? <ToggleRight className="w-4 h-4 mr-1" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
            {on ? "HABILITADO" : "DESHABILITADO"}
          </Button>
        </div>
        {node.children?.map((c) => <Row key={c.key} node={c} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="mt-4">
      {MODULE_TREE.map((m) => <Row key={m.key} node={m} />)}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 bg-background/50 border-white/20 text-white" />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <div className="w-10 h-10 rounded-md border border-white/20 shrink-0" style={{ background: value }} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-background/50 border-white/20 text-white text-xs" />
      </div>
    </div>
  );
}
