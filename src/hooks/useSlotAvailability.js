import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';

export const useSlotAvailability = () => {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSlotCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch all slots with their max_registrations
      const slotsData = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });

      setAllSlots(slotsData);

      // Fetch registrations
      const registrationsData = await pb.collection('registrations').getFullList({
        fields: 'id,slot_id',
      });

      // Count registrations per slot
      const slotCounts = {};
      slotsData.forEach((slot) => {
        slotCounts[slot.id] = 0;
      });

      registrationsData.forEach((registration) => {
        if (slotCounts[registration.slot_id] !== undefined) {
          slotCounts[registration.slot_id]++;
        }
      });

      // Filter available slots based on each slot's individual max_registrations
      const available = slotsData.filter((slot) => {
        const maxForSlot = slot.max_registrations || 15;
        return slotCounts[slot.id] < maxForSlot;
      });

      setAvailableSlots(available);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching slot availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotCounts();

    // Subscribe to registrations changes
    pb.collection('registrations').subscribe('*', () => {
      fetchSlotCounts();
    });

    // Subscribe to slots changes
    pb.collection('slots').subscribe('*', () => {
      fetchSlotCounts();
    });

    return () => {
      pb.collection('registrations').unsubscribe();
      pb.collection('slots').unsubscribe();
    };
  }, []);

  return { availableSlots, allSlots, loading, error, refetch: fetchSlotCounts };
};
