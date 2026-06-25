import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RotateCcw, Settings2, Trash2, KeyRound, Check, X, Pause, Play } from "lucide-react";
import { deleteUser, listAdminUsers, updateUserPassword } from "@/lib/admin-users.functions";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/admin/")({
  component: AdminUsers,
});

type Row = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  modules_count: number;
  device_status: string;
  approval_status: string;
  created_at: string | null;
  provider: string;
};

function AdminUsers() {
  const fetchAdminUsers = useServerFn(listAdminUsers);
  const removeUser = useServerFn(deleteUser);
  const changePassword = useServerFn(updateUserPassword);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwTarget, setPwTarget] = useState<Row | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwRequireChange, setPwRequireChange] = useState(true);
  const [pwSaving, setPwSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Row | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const users = await fetchAdminUsers();
      setRows(users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetDevice = async (userId: string) => {
    const { error } = await supabase.from("user_devices").update({ status: "revoked" }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "admin_reset_device", metadata: { target_user: userId } as never,
    });
    toast.success("Dispositivos reseteados. El próximo login del usuario será aprobado automáticamente.");
    await supabase.from("user_devices").delete().eq("user_id", userId);
    load();
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDelBusy(true);
    const targetId = delTarget.user_id;
    try {
      await removeUser({ data: { targetUserId: targetId } });
      // Optimistic removal so the row disappears immediately from every filter/search.
      setRows((prev) => prev.filter((r) => r.user_id !== targetId));
      toast.success("Usuario eliminado");
      setDelTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDelBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwTarget) return;
    if (pwValue.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }
    if (pwValue !== pwConfirm) { toast.error("Las contraseñas no coinciden."); return; }
    setPwSaving(true);
    try {
      await changePassword({ data: {
        targetUserId: pwTarget.user_id,
        newPassword: pwValue,
        requireChange: pwRequireChange,
        signOutSessions: true,
      } });
      toast.success("La contraseña ha sido restablecida correctamente.");
      setPwTarget(null);
      setPwValue("");
      setPwConfirm("");
      setPwRequireChange(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar contraseña");
    } finally {
      setPwSaving(false);
    }
  };

  const setApproval = async (userId: string, status: "approved" | "rejected" | "suspended" | "pending") => {
    const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "admin_set_approval",
      metadata: { target_user: userId, status } as never,
    });
    toast.success(`Estado actualizado: ${status}`);
    load();
  };

  const pendingCount = rows.filter((r) => r.approval_status === "pending").length;

  const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    suspended: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-display text-xl tracking-[0.1em] text-white">USUARIOS</h2>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              {pendingCount} pendiente{pendingCount === 1 ? "" : "s"} de aprobar
            </span>
          )}
          <Button variant="outline" onClick={load}>Refrescar</Button>
        </div>
      </div>
      {loading ? <div className="text-muted-foreground text-sm">Cargando…</div> : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-background/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left p-3">Usuario</th>
                <th className="text-left p-3">Email</th>
                <th className="p-3">Registro</th>
                <th className="p-3">Acceso</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Módulos</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => (a.approval_status === "pending" ? -1 : 1) - (b.approval_status === "pending" ? -1 : 1))
                .map((r) => (
                <tr key={r.user_id} className="border-t border-white/5 text-white">
                  <td className="p-3">{r.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-center text-xs uppercase">{r.provider}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_STYLES[r.approval_status] ?? "bg-white/10 border-white/10"}`}>
                      {r.approval_status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.role === "admin" ? "bg-aureon-orange/20 text-aureon-orange" : "bg-white/10"}`}>{r.role}</span>
                  </td>
                  <td className="p-3 text-center">{r.modules_count}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {r.approval_status !== "approved" && (
                        <button onClick={() => setApproval(r.user_id, "approved")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"><Check className="w-3 h-3" />Aprobar</button>
                      )}
                      {r.approval_status !== "rejected" && r.role !== "admin" && (
                        <button onClick={() => setApproval(r.user_id, "rejected")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300"><X className="w-3 h-3" />Rechazar</button>
                      )}
                      {r.approval_status === "approved" && r.role !== "admin" && (
                        <button onClick={() => setApproval(r.user_id, "suspended")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300"><Pause className="w-3 h-3" />Suspender</button>
                      )}
                      {r.approval_status === "suspended" && (
                        <button onClick={() => setApproval(r.user_id, "approved")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"><Play className="w-3 h-3" />Reactivar</button>
                      )}
                      <Link to="/admin/asignaciones" search={{ user: r.user_id } as never} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10 text-foreground"><Settings2 className="w-3 h-3" />Módulos</Link>
                      <button onClick={() => resetDevice(r.user_id)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10 text-foreground"><RotateCcw className="w-3 h-3" />Resetear</button>
                      <button onClick={() => { setPwTarget(r); setPwValue(""); setPwConfirm(""); setPwRequireChange(true); }} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-aureon-blue/40 bg-aureon-blue/10 hover:bg-aureon-blue/20 text-aureon-blue"><KeyRound className="w-3 h-3" />Resetear Contraseña</button>
                      <button onClick={() => setDelTarget(r)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-aureon-red/40 bg-aureon-red/10 hover:bg-aureon-red/20 text-aureon-red"><Trash2 className="w-3 h-3" />Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sin usuarios todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Los nuevos registros entran en estado <span className="text-amber-300 font-semibold">pendiente</span> y NO pueden acceder hasta que los apruebes manualmente. El admin único es <code className="text-white/80">agusfutsalcoach@gmail.com</code>.
      </p>

      {/* Dialog: resetear contraseña */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => { if (!o) { setPwTarget(null); setPwValue(""); setPwConfirm(""); setPwRequireChange(true); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear contraseña</DialogTitle>
            <DialogDescription>
              {pwTarget ? (<>
                <span className="block"><span className="text-muted-foreground">Usuario:</span> <span className="text-white">{pwTarget.full_name || "—"}</span></span>
                <span className="block"><span className="text-muted-foreground">Email:</span> <span className="text-white">{pwTarget.email}</span></span>
              </>) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nueva contraseña temporal (mín. 8)</label>
              <PasswordInput value={pwValue} onChange={(e) => setPwValue(e.target.value)} placeholder="Nueva contraseña" autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Confirmar contraseña</label>
              <PasswordInput value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Repite la contraseña" />
              {pwConfirm.length > 0 && pwValue !== pwConfirm && (
                <p className="text-xs text-aureon-red">Las contraseñas no coinciden.</p>
              )}
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pwRequireChange}
                onChange={(e) => setPwRequireChange(e.target.checked)}
                className="mt-0.5 accent-aureon-orange"
              />
              <span>Obligar al usuario a cambiar la contraseña en el próximo inicio de sesión.</span>
            </label>
            <p className="text-[11px] text-muted-foreground">Al confirmar, se cerrarán todas las sesiones activas de este usuario.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwTarget(null); setPwValue(""); setPwConfirm(""); setPwRequireChange(true); }}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={pwSaving || pwValue.length < 8 || pwValue !== pwConfirm}>
              {pwSaving ? "Guardando…" : "Restablecer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: eliminar usuario */}
      <AlertDialog open={!!delTarget} onOpenChange={(o) => { if (!o) setDelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {delTarget ? `Se eliminará permanentemente la cuenta de ${delTarget.email}. Esta acción no se puede deshacer.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={delBusy} className="bg-aureon-red hover:bg-aureon-red/90">
              {delBusy ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
