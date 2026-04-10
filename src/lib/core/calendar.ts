import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * INTERNAL CALENDAR SYSTEM
 * Managed slots, bookings, and round-robin scheduling.
 */

export interface CalendarSlot {
    id: string;
    advisor_id: string;
    start_time: Date;
    end_time: Date;
    is_available: boolean;
}

export class CalendarService {
    /**
     * Finds available slots for a tenant in the lead's local timezone.
     */
    public async getAvailableSlots(tenantId: string, leadTimezone: string) {
        // TODO: Logic to fetch slots and adjust timezones
        console.log(`[CALENDAR] Fetching slots for tenant ${tenantId} in ${leadTimezone}...`);
        return [];
    }

    /**
     * Simplified Round-Robin logic to select the next available advisor.
     */
    public async getNextAvailableAdvisor(tenantId: string) {
        const supabase = await getSupabaseServerClient();
        
        // Fetch advisors ordered by last_booking_at
        const { data, error } = await (supabase
            .from("advisors") as any)
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .order("last_booking_at", { ascending: true })
            .limit(1)
            .single();

        if (error || !data) return null;
        return data;
    }

    /**
     * Books an appointment and syncs back to CRM.
     */
    public async bookAppointment(tenantId: string, leadId: string, advisorId: string, startTime: Date) {
        const supabase = await getSupabaseServerClient();

        // 1. Insert Agendamiento
        await supabase
            .from("agendamientos")
            .insert({
                tenant_id: tenantId,
                id_lead: leadId,
                fecha_agendada_cliente: startTime.toISOString(),
                confirmado: true
            });

        // 2. TODO: Call Orchestrator to notify next step
        console.log(`[CALENDAR] Appointment booked for lead ${leadId} with advisor ${advisorId}`);
    }
}

export const calendarService = new CalendarService();
