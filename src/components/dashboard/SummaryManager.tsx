"use client";

import { ReactNode, useState } from "react";
import { KpiConfig, Tenant } from "@/types/tenant";
import { KpiGenerales } from "@/lib/actions/analytics";
import { SummaryCard } from "@/components/charts/DashboardCharts";
import {
    Phone, PhoneCall, PhoneMissed, Users, UserX, PhoneOff, Voicemail,
    UserMinus, ThumbsDown, Star, Calendar, Clock, TrendingUp, Activity,
    Maximize2, Edit3, Save, X, ChevronUp, ChevronDown, EyeOff, Eye, GripVertical,
    Plus, Trash2, Zap, Timer, PieChart, Target, FolderPlus, ChevronRight,
    MessageCircle, Megaphone, Settings, Check, Link2, Database, Bot, Percent,
    BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTenant } from "@/lib/actions/tenant";
import { useRouter } from "next/navigation";

// DND Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';

const ICON_MAP: Record<string, ReactNode> = {
    "Phone": <Phone />,
    "PhoneCall": <PhoneCall />,
    "PhoneMissed": <PhoneMissed />,
    "Users": <Users />,
    "UserX": <UserX />,
    "PhoneOff": <PhoneOff />,
    "Voicemail": <Voicemail />,
    "UserMinus": <UserMinus />,
    "ThumbsDown": <ThumbsDown />,
    "Star": <Star />,
    "Calendar": <Calendar />,
    "Clock": <Clock />,
    "TrendingUp": <TrendingUp />,
    "Activity": <Activity />,
    "PieChart": <PieChart />,
    "Target": <Target />,
    "Zap": <Zap />,
    "Timer": <Timer />,
    "MessageCircle": <MessageCircle />,
    "Megaphone": <Megaphone />,
    "Settings": <Settings />,
    "Check": <Check />,
    "Database": <Database />,
    "Link2": <Link2 />,
    "Bot": <Bot />,
    "Percent": <Percent />,
    "BarChart3": <BarChart3 />,
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);
const AVAILABLE_COLORS = [
    { name: "Blue", class: "bg-blue-600" },
    { name: "Indigo", class: "bg-indigo-600" },
    { name: "Purple", class: "bg-purple-600" },
    { name: "Violet", class: "bg-violet-600" },
    { name: "Emerald", class: "bg-emerald-600" },
    { name: "Teal", class: "bg-teal-600" },
    { name: "Cyan", class: "bg-cyan-600" },
    { name: "Orange", class: "bg-orange-600" },
    { name: "Rose", class: "bg-rose-600" },
    { name: "Slate", class: "bg-slate-600" },
    { name: "Zinc", class: "bg-zinc-800" },
];

const COL_SPAN_MAP: Record<string, string> = {
    "1": "md:col-span-1",
    "2": "md:col-span-2",
    "3": "md:col-span-3",
    "4": "md:col-span-4",
    "5": "md:col-span-5",
    "6": "md:col-span-6",
    "8": "md:col-span-8",
    "9": "md:col-span-9",
    "12": "md:col-span-12",
};

interface SectionHeaderProps {
    title: string;
    isEditing?: boolean;
    onTitleChange?: (newTitle: string) => void;
}

function SectionHeader({ title, isEditing, onTitleChange }: SectionHeaderProps) {
    return (
        <div className="col-span-12 mt-8 mb-2 first:mt-0">
            <div className="flex items-center gap-4">
                {isEditing ? (
                    <div className="flex items-center gap-2 group/header w-full">
                        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg border border-border">
                            <Plus className="h-3 w-3 text-muted-foreground" />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => onTitleChange?.(e.target.value)}
                                className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground bg-transparent outline-none min-w-[150px]"
                                placeholder="NOMBRE DEL GRUPO"
                            />
                        </div>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                ) : (
                    <>
                        <h2 className="text-[12px] font-bold uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                            {title}
                        </h2>
                        <div className="h-px w-full bg-slate-100" />
                    </>
                )}
            </div>
        </div>
    );
}

interface Props {
    tenant: Tenant;
    initialKpis: KpiConfig[];
    values: KpiGenerales;
    dynamicValues: Record<string, number>;
    isAdmin: boolean;
    configKey?: string;
    title?: ReactNode;
}

interface SortableKpiProps {
    k: KpiConfig;
    idx: number;
    isEditing: boolean;
    move: (index: number, direction: 'up' | 'down') => void;
    cycleSize: (id: string, current: string) => void;
    updateKpi: (id: string, updates: Partial<KpiConfig>) => void;
    removeKpi: (id: string) => void;
    val: any;
    totalCount: number;
}

function SortableKpi({ k, idx, isEditing, move, cycleSize, updateKpi, removeKpi, val, totalCount, onConfigure }: SortableKpiProps & { onConfigure: (id: string) => void }) {
    const [showDataEditor, setShowDataEditor] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: k.id, disabled: !isEditing });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const colSpanClass = COL_SPAN_MAP[k.size || "4"] || "md:col-span-4";

    // eslint-disable-next-line react/forbid-component-props
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                colSpanClass,
                "relative group transition-all duration-300 w-full min-w-0",
                isDragging && "opacity-50"
            )}
        >
            <div className={cn(
                "h-full transition-all duration-300",
                isEditing && "ring-4 ring-primary/30 rounded-[32px] scale-[1.03] z-[40] shadow-2xl relative bg-card",
                isEditing && k.isVisible === false && "opacity-40 grayscale"
            )}>
                <SummaryCard
                    label={k.label as string}
                    value={typeof val === 'number' ? val.toLocaleString('es-ES') : val}
                    icon={ICON_MAP[k.icon] || <Activity className="h-6 w-6 text-white" />}
                    bgColor={k.color || "bg-slate-600"}
                />

                {/* Edit Overlays - Simplified */}
                {isEditing && (
                    <div className="absolute inset-0 z-[50] flex items-center justify-center bg-background/40 dark:bg-slate-950/40 backdrop-blur-[2px] rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity border-2 border-primary/50">
                        <div className="flex items-center gap-1.5 bg-card/90 p-2 rounded-2xl shadow-xl border border-border backdrop-blur-md">
                            {/* Drag Handle */}
                            <div {...attributes} {...listeners} className="p-2 text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-5 w-5" />
                            </div>

                            <button
                                title="Configurar Bloque"
                                onClick={() => onConfigure(k.id)}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors bg-primary/5 border border-primary/20"
                            >
                                <Settings className="h-5 w-5" />
                            </button>

                            <button
                                title="Cambiar Tamaño"
                                onClick={() => cycleSize(k.id, k.size)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                                <Maximize2 className="h-5 w-5" />
                            </button>

                            <button
                                title={k.isVisible === false ? "Mostrar" : "Ocultar"}
                                onClick={() => updateKpi(k.id, { isVisible: k.isVisible === false })}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    k.isVisible === false ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                )}
                            >
                                {k.isVisible === false ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </button>

                            <button
                                title="Eliminar Bloque"
                                onClick={() => removeKpi(k.id)}
                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function SummaryManager({ tenant, initialKpis, values, dynamicValues, isAdmin, configKey = 'kpis', title }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [kpis, setKpis] = useState<KpiConfig[]>(initialKpis);
    const [saving, setSaving] = useState(false);
    const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
    const [isAddingKpi, setIsAddingKpi] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const router = useRouter();

    const editingKpi = kpis.find(k => k.id === editingKpiId);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    async function handleSave() {
        setSaving(true);
        try {
            const newConfig = {
                ...(tenant.config as any),
                [configKey]: kpis
            };
            const res = await updateTenant(tenant.id, { config: newConfig });
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert("Error al guardar: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error inesperado al guardar");
        } finally {
            setSaving(false);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setKpis((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                
                const updatedItems = [...items];
                const activeItem = { ...updatedItems[oldIndex] };
                const overItem = { ...updatedItems[newIndex] };
                
                // Perform a direct swap:
                // 1. Swap their group assignments so they look correct in their new sections
                const oldGroup = activeItem.group;
                activeItem.group = overItem.group;
                overItem.group = oldGroup;
                
                // 2. Swap their positions in the array
                updatedItems[oldIndex] = overItem;
                updatedItems[newIndex] = activeItem;
                
                return updatedItems;
            });
        }
    }

    function move(index: number, direction: 'up' | 'down') {
        const newKpis = [...kpis];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newKpis.length) return;

        const temp = newKpis[index];
        newKpis[index] = newKpis[targetIndex];
        newKpis[targetIndex] = temp;
        setKpis(newKpis);
    }

    function updateKpi(id: string, updates: Partial<KpiConfig>) {
        setKpis(kpis.map(k => k.id === id ? { ...k, ...updates } : k));
    }

    function addKpi(selectedGroup: string) {
        const newKpi: KpiConfig = {
            id: `kpi-${Date.now()}`,
            label: 'Nuevo Bloque',
            icon: 'Activity',
            color: 'bg-primary',
            size: '4',
            isVisible: true,
            group: selectedGroup,
            // Pre-configure as a connected KPI by default since "Conectar tablas" was merged
            calcType: "count",
            targetCol: "llamadas.id"
        };
        setKpis(prev => [newKpi, ...prev]);
        setIsAddingKpi(false);
        setEditingKpiId(newKpi.id); // Open sidebar immediately for the new block
    }

    const existingGroups = Array.from(new Set(kpis.map(k => k.group).filter(Boolean))) as string[];

    function removeKpi(id: string) {
        if (confirm("¿Estás seguro de eliminar este bloque?")) {
            setKpis(kpis.filter(k => k.id !== id));
        }
    }

    function cycleSize(id: string, current: string) {
        const sizes: KpiConfig["size"][] = ["3", "4", "6", "12"];
        const currentIndex = sizes.indexOf(current as any);
        const nextSize = sizes[(currentIndex + 1) % sizes.length];
        updateKpi(id, { size: nextSize });
    }

    function updateGroupName(oldName: string, newName: string) {
        setKpis(kpis.map(k => k.group === oldName ? { ...k, group: newName } : k));
    }

    return (
        <div className="mb-10 relative">
            <div className="flex items-center justify-between mb-8">
                {title ? title : (
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-[20px]">
                            <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                Métricas <span className="text-blue-600 dark:text-blue-400">Generales</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px]">
                                Rendimiento global y estadísticas del sistema
                            </p>
                        </div>
                    </div>
                )}

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsAddingKpi(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-foreground bg-card border border-border rounded-xl hover:bg-muted transition-all"
                                >
                                    <FolderPlus className="h-4 w-4" /> Crear grupo
                                </button>
                                <button
                                    onClick={() => setIsAddingKpi(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary bg-card border border-primary/20 rounded-xl hover:bg-primary/5 transition-all shadow-sm"
                                >
                                    <Plus className="h-4 w-4" /> Crear bloque
                                </button>
                                <div className="w-px h-6 bg-border mx-1" />
                                <button
                                    onClick={() => { setKpis(initialKpis); setIsEditing(false); }}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground bg-card border border-border rounded-xl hover:bg-muted transition-all font-outfit"
                                >
                                    <X className="h-4 w-4" /> Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 font-outfit"
                                >
                                    <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-all"
                            >
                                <Edit3 className="h-4 w-4" /> Personalizar Tablero
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToFirstScrollableAncestor]}
            >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 text-left transition-all duration-500">
                    <SortableContext
                        items={kpis.filter(k => isEditing || k.isVisible !== false).map(k => k.id)}
                        strategy={rectSortingStrategy}
                    >
                        {(() => {
                            const filtered = kpis.filter(k => isEditing || k.isVisible !== false);
                            let lastGroup = title ? "" : "Métricas Generales";
                            
                            return filtered.map((k, idx) => {
                                // Determine value
                                let val: any = 0;
                                if (k.staticKey) {
                                    val = (values as any)[k.staticKey] ?? 0;
                                } else {
                                    val = dynamicValues[k.id] || 0;
                                }

                                // Format numeric values
                                if (typeof val === 'number') {
                                    if (k.calcType === "avg" || k.isPercentage) {
                                        val = Number(val).toFixed(1);
                                    } else {
                                        val = Number(val).toLocaleString('es-ES');
                                    }
                                }
                                // Append suffix (e.g. ' min', ' seg', '%')
                                if (k.suffix && val !== null && val !== undefined) {
                                    val = `${val}${k.suffix}`;
                                }
                                if (k.isPercentage && !k.suffix) val = `${val}%`;

                                const showHeader = k.group && k.group !== lastGroup;
                                if (k.group) lastGroup = k.group;

                                return (
                                    <div key={k.id} className={cn(COL_SPAN_MAP[k.size || "4"] || "md:col-span-4", "md:contents")}>
                                        {showHeader && (
                                            <SectionHeader 
                                                title={k.group!} 
                                                key={`header-${k.group}`} 
                                                isEditing={isEditing}
                                                onTitleChange={(newTitle) => updateGroupName(k.group!, newTitle)}
                                            />
                                        )}
                                        <SortableKpi
                                            k={k}
                                            idx={idx}
                                            isEditing={isEditing}
                                            move={move}
                                            cycleSize={cycleSize}
                                            updateKpi={updateKpi}
                                            removeKpi={removeKpi}
                                            val={val}
                                            totalCount={filtered.length}
                                            onConfigure={(id) => setEditingKpiId(id)}
                                        />
                                    </div>
                                );
                            });
                        })()}
                    </SortableContext>
                </div>
            </DndContext>

            {/* Unified Sidebar Editor */}
            {isEditing && editingKpiId && editingKpi && (
                <>
                    <div 
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
                        onClick={() => setEditingKpiId(null)}
                    />
                    <div className="fixed top-0 right-0 h-full w-[400px] bg-card border-l border-border shadow-2xl z-[101] animate-in slide-in-from-right duration-500 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl shadow-lg", editingKpi.color || "bg-primary")}>
                                    {editingKpi.icon && ICON_MAP[editingKpi.icon] ? 
                                        Object.assign({}, ICON_MAP[editingKpi.icon], {
                                            props: { ...((ICON_MAP[editingKpi.icon] as any).props), className: "h-5 w-5 text-white" }
                                        }) : <Activity className="h-5 w-5 text-white" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Configurar Bloque</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{editingKpi.label as string || "Sin nombre"}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setEditingKpiId(null)}
                                className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground group"
                                title="Cerrar Editor"
                            >
                                <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Identidad */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-primary">
                                    <Edit3 className="h-4 w-4" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Identidad</h4>
                                </div>
                                <div className="space-y-3 pl-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Título del KPI</label>
                                        <input
                                            type="text"
                                            value={editingKpi.label as string}
                                            onChange={(e) => updateKpi(editingKpi.id, { label: e.target.value })}
                                            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary transition-all"
                                            placeholder="Ej: Leads Totales"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Grupo (Categoría)</label>
                                        <input
                                            type="text"
                                            value={editingKpi.group || ""}
                                            onChange={(e) => updateKpi(editingKpi.id, { group: e.target.value })}
                                            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary transition-all"
                                            placeholder="Ej: VENTAS"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Diseño */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <PieChart className="h-4 w-4" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Diseño y Apariencia</h4>
                                </div>
                                <div className="space-y-5 pl-6">
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Seleccionar Icono</label>
                                        <div className="grid grid-cols-6 gap-2 p-3 bg-muted/50 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar border border-border">
                                            {AVAILABLE_ICONS.map(iconName => (
                                                <button
                                                    key={iconName}
                                                    onClick={() => updateKpi(editingKpi.id, { icon: iconName })}
                                                    className={cn(
                                                        "flex items-center justify-center p-2.5 rounded-xl transition-all aspect-square",
                                                        editingKpi.icon === iconName ? "bg-primary text-white shadow-xl scale-110" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                                    )}
                                                    title={iconName}
                                                >
                                                    {Object.assign({}, ICON_MAP[iconName], {
                                                        props: { ...((ICON_MAP[iconName] as any).props), className: "h-4 w-4" }
                                                    })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Color de Fondo</label>
                                        <div className="flex flex-wrap gap-2 p-1">
                                            {AVAILABLE_COLORS.map(color => (
                                                <button
                                                    key={color.class}
                                                    onClick={() => updateKpi(editingKpi.id, { color: color.class })}
                                                    className={cn(
                                                        "h-7 w-7 rounded-full border-4 transition-all hover:scale-125",
                                                        color.class,
                                                        editingKpi.color === color.class ? "border-primary shadow-xl ring-2 ring-primary/20 scale-110" : "border-transparent opacity-80 hover:opacity-100"
                                                    )}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Datos */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-500">
                                    <Database className="h-4 w-4" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Conexión de Datos</h4>
                                </div>
                                <div className="space-y-4 pl-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Origen (Tabla / Columna)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select 
                                                title="Tabla Supabase"
                                                value={editingKpi.targetCol?.split('.')[0] || "llamadas"}
                                                onChange={(e) => updateKpi(editingKpi.id, { targetCol: `${e.target.value}.${editingKpi.targetCol?.split('.')[1] || "id"}` })}
                                                className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                            >
                                                <option value="lead">Leads</option>
                                                <option value="llamadas">Llamadas</option>
                                                <option value="agendamientos">Agendamientos</option>
                                                <option value="lead_cualificacion">Cualificaciones</option>
                                                <option value="intentos_llamadas">Intentos</option>
                                                <option value="conversaciones_whatsapp">WhatsApp</option>
                                            </select>
                                            <input 
                                                type="text"
                                                placeholder="columna"
                                                value={editingKpi.targetCol?.split('.')[1] || ""}
                                                onChange={(e) => updateKpi(editingKpi.id, { targetCol: `${editingKpi.targetCol?.split('.')[0] || "llamadas"}.${e.target.value}` })}
                                                className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Método de Cálculo</label>
                                        <select 
                                            title="Operación"
                                            value={editingKpi.calcType || "count"}
                                            onChange={(e) => updateKpi(editingKpi.id, { calcType: e.target.value as any })}
                                            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                        >
                                            <option value="count">Contar Registros (Count)</option>
                                            <option value="sum">Sumatoria de Valores (Sum)</option>
                                            <option value="avg">Promedio de Valores (Avg)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Filtro Condicional (Opcional)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                placeholder="columna"
                                                value={editingKpi.condCol || ""}
                                                onChange={(e) => updateKpi(editingKpi.id, { condCol: e.target.value })}
                                                className="flex-1 min-w-0 bg-muted border border-border rounded-xl px-2 py-2 text-[11px] font-bold text-foreground outline-none focus:border-indigo-500 transition-all"
                                            />
                                            <select 
                                                title="Operador"
                                                value={editingKpi.condOp || "="}
                                                onChange={(e) => updateKpi(editingKpi.id, { condOp: e.target.value as any })}
                                                className="bg-muted border border-border rounded-xl px-1 py-2 text-[11px] font-bold text-foreground outline-none cursor-pointer"
                                            >
                                                <option value="=">=</option>
                                                <option value="!=">!=</option>
                                                <option value="ILIKE">~</option>
                                                <option value=">">&gt;</option>
                                                <option value="<">&lt;</option>
                                            </select>
                                            <input 
                                                type="text"
                                                placeholder="valor"
                                                value={editingKpi.condVal || ""}
                                                onChange={(e) => updateKpi(editingKpi.id, { condVal: e.target.value })}
                                                className="flex-1 min-w-0 bg-muted border border-border rounded-xl px-2 py-2 text-[11px] font-bold text-foreground outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div 
                                            className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 cursor-pointer hover:bg-indigo-500/10 transition-all"
                                            onClick={() => updateKpi(editingKpi.id, { isPercentage: !editingKpi.isPercentage })}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                editingKpi.isPercentage ? "bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/20" : "border-border bg-muted"
                                            )}>
                                                {editingKpi.isPercentage && <Check className="h-3.5 w-3.5 text-white" />}
                                            </div>
                                            <span className="text-[11px] font-black text-foreground uppercase tracking-wider">Métrica Porcentual (%)</span>
                                        </div>

                                        {editingKpi.isPercentage && (
                                            <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                                                    <Target className="h-3.5 w-3.5" />
                                                    <label className="text-[9px] font-black uppercase tracking-widest">Configurar Denominador</label>
                                                </div>
                                                <div className="space-y-2">
                                                    <input 
                                                        type="text"
                                                        placeholder="Origen (ej: lead.id)"
                                                        value={editingKpi.denomTargetCol || ""}
                                                        onChange={(e) => updateKpi(editingKpi.id, { denomTargetCol: e.target.value })}
                                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-[11px] font-bold text-foreground outline-none focus:border-indigo-500 transition-all"
                                                    />
                                                    <select 
                                                        title="Cálculo Denominador"
                                                        value={editingKpi.denomCalcType || "count"}
                                                        onChange={(e) => updateKpi(editingKpi.id, { denomCalcType: e.target.value as any })}
                                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-[11px] font-bold text-foreground outline-none cursor-pointer"
                                                    >
                                                        <option value="count">Contar Filas</option>
                                                        <option value="sum">Sumar Columna</option>
                                                        <option value="avg">Promedio Columna</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/30">
                            <button
                                onClick={() => setEditingKpiId(null)}
                                className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:shadow-primary/20 active:scale-95 transition-all text-sm"
                            >
                                Finalizar Edición
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal de Selección de Grupo */}
            {isAddingKpi && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setIsAddingKpi(false)}
                    />
                    <div className="relative bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Nuevo Bloque</h2>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Selecciona la ubicación del bloque</p>
                            </div>
                            <button 
                                onClick={() => setIsAddingKpi(false)}
                                className="p-2 hover:bg-muted rounded-xl transition-all"
                                title="Cerrar"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Grupos Existentes</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {existingGroups.length > 0 ? existingGroups.map(group => (
                                        <button
                                            key={group}
                                            onClick={() => addKpi(group)}
                                            className="flex items-center justify-between p-4 bg-muted/40 hover:bg-primary/5 border border-border hover:border-primary/30 rounded-2xl transition-all group"
                                        >
                                            <span className="text-xs font-black text-foreground uppercase tracking-wider">{group}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                        </button>
                                    )) : (
                                        <p className="text-[10px] text-center py-4 bg-muted/20 rounded-2xl italic text-muted-foreground">Sin grupos definidos aún</p>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-black">
                                    <span className="bg-card px-3 text-muted-foreground tracking-[0.3em]">o crea uno nuevo</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre del nuevo grupo..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newGroupName.trim()) {
                                                addKpi(newGroupName.trim().toUpperCase());
                                                setNewGroupName("");
                                            }
                                        }}
                                        className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground outline-none focus:border-primary transition-all"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newGroupName.trim()) {
                                                addKpi(newGroupName.trim().toUpperCase());
                                                setNewGroupName("");
                                            }
                                        }}
                                        disabled={!newGroupName.trim()}
                                        className="px-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:grayscale"
                                        title="Confirmar nuevo grupo"
                                    >
                                        <Check className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border">
                            <button
                                onClick={() => setIsAddingKpi(false)}
                                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
