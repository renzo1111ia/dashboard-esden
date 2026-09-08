"use client";

import React, { useState, useEffect } from "react";
import { INITIAL_TABLES, INITIAL_RESERVATIONS, INITIAL_ZONES, formatCLP } from "@/lib/mock-pedidos-data";
import { Table, Reservation, TableStatus, Zone } from "@/types/pedidos";
import { TablesCanvas } from "@/components/pedidos/TablesCanvas";
import { TableDetailModal } from "@/components/pedidos/TableDetailModal";
import { OrderListTable } from "@/components/pedidos/OrderListTable";
import { SimulationModal } from "@/components/pedidos/SimulationModal";
import { EditTableModal } from "@/components/pedidos/EditTableModal";
import { ZoneManagerModal } from "@/components/pedidos/ZoneManagerModal";

import { useTenantStore } from "@/store/tenant";
import {
  Utensils,
  LayoutGrid,
  List,
  Sparkles,
  Users,
  Clock,
  TrendingUp,
  Bot,
  Filter,
  Move,
  Plus,
  Layers,
  Check,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PedidosPage() {
  const { tenantId } = useTenantStore();
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [reservations, setReservations] = useState<Record<string, Reservation>>(INITIAL_RESERVATIONS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Modals state
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null | undefined>(undefined); // undefined means modal closed
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState<boolean>(false);

  // Sincronización en vivo con el servidor / WhatsApp
  const loadRestaurantData = async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/restaurant/state?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tables) setTables(data.tables);
        if (data.reservations) setReservations(data.reservations);
        if (data.zones) setZones(data.zones);
      }
    } catch (e) {
      console.warn("[PedidosPage] Error loading state:", e);
    }
  };

  useEffect(() => {
    loadRestaurantData();
    const interval = setInterval(loadRestaurantData, 6000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const persistServerState = async (
    updatedTables?: Table[],
    updatedReservations?: Record<string, Reservation>,
    updatedZones?: Zone[]
  ) => {
    if (!tenantId) return;
    setIsSyncing(true);
    try {
      await fetch(`/api/restaurant/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          state: {
            tables: updatedTables || tables,
            reservations: updatedReservations || reservations,
            zones: updatedZones || zones,
          },
        }),
      });
    } catch (e) {
      console.error("[PedidosPage] Error persisting state:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Stats KPIs
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === "ocupada").length;
  const reservedTables = tables.filter((t) => t.status === "reservada").length;
  const occupancyPercentage =
    totalTables > 0 ? Math.round(((occupiedTables + reservedTables) / totalTables) * 100) : 0;
  const totalBillings = Object.values(reservations).reduce((sum, r) => sum + r.totalAmount, 0);

  // Table Status update
  const handleUpdateStatus = (tableId: string, newStatus: TableStatus) => {
    const updated = tables.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t));
    setTables(updated);
    if (activeTable && activeTable.id === tableId) {
      setActiveTable((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    persistServerState(updated);
  };

  const handleSaveReservation = (updatedRes: Reservation) => {
    const updated = {
      ...reservations,
      [updatedRes.id]: updatedRes,
    };
    setReservations(updated);
    persistServerState(undefined, updated);
  };

  const handleSimulateReservation = (newRes: Reservation, targetTableId: string) => {
    const updatedRes = {
      ...reservations,
      [newRes.id]: newRes,
    };
    setReservations(updatedRes);

    const updatedTables = tables.map((t) =>
      t.id === targetTableId
        ? { ...t, status: "reservada" as const, currentReservationId: newRes.id }
        : t
    );
    setTables(updatedTables);
    persistServerState(updatedTables, updatedRes);
  };

  const handleResetToZero = async () => {
    if (!confirm("¿Deseas reiniciar todas las mesas a 'Disponible' y vaciar las reservas para empezar desde cero?")) return;
    const cleanTables = INITIAL_TABLES.map((t) => ({
      ...t,
      status: "disponible" as const,
      currentReservationId: undefined,
    }));
    setTables(cleanTables);
    setReservations({});
    await persistServerState(cleanTables, {});
  };

  // Table CRUD
  const handleSaveTableData = (tableData: Partial<Table>) => {
    if (!tableData.id) return;

    let updated: Table[];
    const exists = tables.some((t) => t.id === tableData.id);
    if (exists) {
      updated = tables.map((t) => (t.id === tableData.id ? ({ ...t, ...tableData } as Table) : t));
    } else {
      updated = [...tables, tableData as Table];
    }
    setTables(updated);
    persistServerState(updated);
  };

  const handleDeleteTable = (tableId: string) => {
    const updated = tables.filter((t) => t.id !== tableId);
    setTables(updated);
    persistServerState(updated);
  };

  const handleUpdateTablePosition = (tableId: string, position: { x: number; y: number }) => {
    const updated = tables.map((t) => (t.id === tableId ? { ...t, position } : t));
    setTables(updated);
    persistServerState(updated);
  };

  // Zone CRUD
  const handleAddZone = (newZone: Zone) => {
    const updated = [...zones, newZone];
    setZones(updated);
    persistServerState(undefined, undefined, updated);
  };

  const handleDeleteZone = (zoneId: string) => {
    const updated = zones.filter((z) => z.id !== zoneId);
    setZones(updated);
    if (selectedZone === zoneId) setSelectedZone("all");
    persistServerState(undefined, undefined, updated);
  };

  const currentReservation = activeTable?.currentReservationId
    ? reservations[activeTable.currentReservationId] || null
    : null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER TITLE & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Utensils className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Gestión de Pedidos & Plano de Mesas</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Diseño interactivo del local (restaurante, pub, bar) con reservas automatizadas vía IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Layout Edit Toggle Button */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 border",
              isEditMode
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800"
            )}
          >
            {isEditMode ? (
              <>
                <Check className="h-4 w-4" /> Finalizar Edición del Plano
              </>
            ) : (
              <>
                <Move className="h-4 w-4 text-amber-400" /> Modo Edición del Plano
              </>
            )}
          </button>

          {/* Edit Mode Quick Tools */}
          {isEditMode && (
            <>
              <button
                onClick={() => setEditingTable(null)} // null = create new table
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Añadir Mesa
              </button>

              <button
                onClick={() => setIsZoneManagerOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
              >
                <Layers className="h-4 w-4" /> Espacios & Zonas
              </button>
            </>
          )}

          {/* Simulate AI reservation & Live Sync buttons */}
          {!isEditMode && (
            <>
              <button
                onClick={loadRestaurantData}
                disabled={isSyncing}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                title="Actualizar mesas y reservas en vivo desde WhatsApp"
              >
                <RefreshCw className={cn("h-4 w-4 text-emerald-400", isSyncing && "animate-spin")} />
                <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
              </button>

              <button
                onClick={handleResetToZero}
                disabled={isSyncing}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                title="Reiniciar todas las mesas a 'Disponible' y vaciar reservas para empezar completamente de cero"
              >
                <RotateCcw className="h-4 w-4 text-amber-400" />
                <span>Empezar de Cero</span>
              </button>

              <button
                onClick={() => setIsSimulating(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Simular Reserva IA
              </button>
            </>
          )}

          {/* View Mode Switcher (Canvas vs List) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode("canvas")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all",
                viewMode === "canvas"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <LayoutGrid className="h-4 w-4" /> Plano (Canvas)
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all",
                viewMode === "list"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <List className="h-4 w-4" /> Lista de Pedidos
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Ocupación Total</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{occupancyPercentage}%</span>
              <span className="text-xs text-slate-400 font-medium">({occupiedTables + reservedTables}/{totalTables} mesas)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Reservas Activas IA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300">{reservedTables}</span>
              <span className="text-xs text-amber-400 font-medium">vía WhatsApp/Voz</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bot className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Mesas Ocupadas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400">{occupiedTables}</span>
              <span className="text-xs text-rose-300/80 font-medium">En servicio</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Consumo Estimado</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">{formatCLP(totalBillings)}</span>
              <span className="text-xs text-emerald-500/80 font-medium">acumulado</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* DYNAMIC ZONES SELECTOR TABS */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs overflow-x-auto gap-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-2">
            <Filter className="h-3.5 w-3.5" /> Espacio / Zona:
          </span>

          <button
            onClick={() => setSelectedZone("all")}
            className={cn(
              "px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap",
              selectedZone === "all"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
            )}
          >
            Plano General (Todas)
          </button>

          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap capitalize",
                selectedZone === zone.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              )}
            >
              {zone.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsZoneManagerOpen(true)}
          className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          <Layers className="h-3.5 w-3.5" /> Editar Espacios
        </button>
      </div>

      {/* MAIN VIEW CONTENT (CANVAS OR LIST) */}
      {viewMode === "canvas" ? (
        <TablesCanvas
          tables={tables}
          reservations={reservations}
          zones={zones}
          selectedZone={selectedZone}
          isEditMode={isEditMode}
          onSelectTable={(table) => setActiveTable(table)}
          onEditTable={(table) => setEditingTable(table)}
          onDeleteTable={handleDeleteTable}
          onUpdateTablePosition={handleUpdateTablePosition}
        />
      ) : (
        <OrderListTable
          tables={tables}
          reservations={reservations}
          onSelectTable={(table) => setActiveTable(table)}
        />
      )}

      {/* TABLE DETAIL MODAL / DRAWER */}
      {activeTable && (
        <TableDetailModal
          table={activeTable}
          reservation={currentReservation}
          onClose={() => setActiveTable(null)}
          onUpdateStatus={handleUpdateStatus}
          onSaveReservation={handleSaveReservation}
        />
      )}

      {/* EDIT / CREATE TABLE MODAL */}
      {editingTable !== undefined && (
        <EditTableModal
          table={editingTable}
          zones={zones}
          onClose={() => setEditingTable(undefined)}
          onSave={handleSaveTableData}
          onDelete={handleDeleteTable}
        />
      )}

      {/* ZONE MANAGER MODAL */}
      {isZoneManagerOpen && (
        <ZoneManagerModal
          zones={zones}
          onClose={() => setIsZoneManagerOpen(false)}
          onAddZone={handleAddZone}
          onDeleteZone={handleDeleteZone}
        />
      )}

      {/* SIMULATION MODAL */}
      {isSimulating && (
        <SimulationModal
          tables={tables}
          onClose={() => setIsSimulating(false)}
          onSimulate={handleSimulateReservation}
        />
      )}
    </div>
  );
}
