import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { changeMyPassword } from "@/lib/admin-users.functions";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the user cannot close the dialog until the password is changed. */
  mandatory?: boolean;
  onChanged?: () => void;
};

export function ChangePasswordDialog({ open, onOpenChange, mandatory, onChanged }: Props) {
  const change = useServerFn(changeMyPassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };

  const submit = async () => {
    if (!current) { toast.error("Introduce tu contraseña actual."); return; }
    if (next.length < 8) { toast.error("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (next !== confirm) { toast.error("Las contraseñas no coinciden."); return; }
    if (next === current) { toast.error("La nueva contraseña no puede ser igual a la anterior."); return; }
    setSaving(true);
    try {
      await change({ data: { currentPassword: current, newPassword: next } });
      toast.success("Tu contraseña ha sido actualizada correctamente.");
      reset();
      onChanged?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (mandatory && !o) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        onInteractOutside={(e) => { if (mandatory) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (mandatory) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            {mandatory
              ? "Por seguridad, debes establecer una nueva contraseña antes de continuar."
              : "Introduce tu contraseña actual y elige una nueva."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Contraseña actual</label>
            <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nueva contraseña (mín. 8)</label>
            <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Confirmar nueva contraseña</label>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm.length > 0 && next !== confirm && (
              <p className="text-xs text-aureon-red">Las contraseñas no coinciden.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          {!mandatory && (
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>Cancelar</Button>
          )}
          <Button onClick={submit} disabled={saving || next.length < 8 || next !== confirm || !current}>
            {saving ? "Guardando…" : "Actualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
