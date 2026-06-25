import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/equipo")({
  component: EquipoLayout,
});

function EquipoLayout() {
  return <Outlet />;
}
