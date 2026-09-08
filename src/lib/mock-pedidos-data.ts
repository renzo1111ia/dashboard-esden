import { Table, Reservation, Zone, DeliveryOrder } from "@/types/pedidos";

export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const INITIAL_ZONES: Zone[] = [
  {
    id: "terraza",
    name: "🌿 Terraza Exterior",
    description: "Mesas al aire libre y jardín principal",
  },
  {
    id: "salon_principal",
    name: "🏛️ Salón Principal",
    description: "Mesas climatizadas de alta capacidad",
  },
  {
    id: "pub_bar",
    name: "🍺 Barra / Pub",
    description: "Zona de taburetes, copas y mesas de barra alta",
  },
  {
    id: "vip",
    name: "✨ Zona VIP & Reservados",
    description: "Ambiente privado con atención preferencial",
  },
];

export const INITIAL_TABLES: Table[] = [
  {
    id: "table-1",
    number: 1,
    name: "Mesa 1",
    capacity: 2,
    zone: "terraza",
    status: "disponible",
    position: { x: 15, y: 20 },
    shape: "round",
  },
  {
    id: "table-2",
    number: 2,
    name: "Mesa 2",
    capacity: 2,
    zone: "terraza",
    status: "disponible",
    position: { x: 35, y: 20 },
    shape: "round",
  },
  {
    id: "table-3",
    number: 3,
    name: "Mesa 3",
    capacity: 4,
    zone: "terraza",
    status: "disponible",
    position: { x: 55, y: 20 },
    shape: "square",
  },
  {
    id: "table-4",
    number: 4,
    name: "Mesa 4",
    capacity: 4,
    zone: "terraza",
    status: "disponible",
    position: { x: 78, y: 20 },
    shape: "square",
  },
  {
    id: "table-5",
    number: 5,
    name: "Mesa 5",
    capacity: 4,
    zone: "salon_principal",
    status: "disponible",
    position: { x: 18, y: 55 },
    shape: "square",
  },
  {
    id: "table-6",
    number: 6,
    name: "Mesa 6 (Central)",
    capacity: 6,
    zone: "salon_principal",
    status: "disponible",
    position: { x: 42, y: 55 },
    shape: "rectangle",
  },
  {
    id: "table-7",
    number: 7,
    name: "Mesa 7",
    capacity: 4,
    zone: "salon_principal",
    status: "disponible",
    position: { x: 68, y: 55 },
    shape: "square",
  },
  {
    id: "table-10",
    number: 10,
    name: "Barra Alta 1",
    capacity: 2,
    zone: "pub_bar",
    status: "disponible",
    position: { x: 85, y: 55 },
    shape: "round",
  },
  {
    id: "table-8",
    number: 8,
    name: "Mesa VIP 1",
    capacity: 8,
    zone: "vip",
    status: "disponible",
    position: { x: 25, y: 82 },
    shape: "rectangle",
  },
  {
    id: "table-9",
    number: 9,
    name: "Mesa VIP 2",
    capacity: 6,
    zone: "vip",
    status: "disponible",
    position: { x: 65, y: 82 },
    shape: "rectangle",
  },
];

export const INITIAL_RESERVATIONS: Record<string, Reservation> = {};
export const INITIAL_ORDERS: DeliveryOrder[] = [];
