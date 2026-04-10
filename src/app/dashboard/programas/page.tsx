import ProgramManager from "@/components/programas/ProgramManager";

export const metadata = {
    title: "Gestión de Programas | ESDEN Dashboard",
    description: "Configuración detallada de cursos y reglas de cualificación por programa.",
};

export default function ProgramasPage() {
    return (
        <div className="p-8">
            <ProgramManager />
        </div>
    );
}
