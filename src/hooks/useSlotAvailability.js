import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';

export const useSlotAvailability = (userTajweedLevel = null) => {
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

      // Fetch all users (slot admins) with their Tajweed level settings
      const usersData = await pb.collection('users').getFullList({
        filter: 'role = "slot_admin"',
        fields: 'id,assigned_slot_id,tajweed_beginner,tajweed_intermediate,tajweed_advanced',
      });

      // Create a map of slot_id to user's Tajweed settings
      const slotTajweedSettings = {};
      usersData.forEach((user) => {
        if (user.assigned_slot_id) {
          slotTajweedSettings[user.assigned_slot_id] = {
            beginner: user.tajweed_beginner || false,
            intermediate: user.tajweed_intermediate || false,
            advanced: user.tajweed_advanced || false,
          };
        }
      });

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
      let available = slotsData.filter((slot) => {
        const maxForSlot = slot.max_registrations || 15;
        return slotCounts[slot.id] < maxForSlot;
      });

      // Apply Tajweed level filtering if user has selected a level
      if (userTajweedLevel) {
        available = available.filter((slot) => {
          const settings = slotTajweedSettings[slot.id];

          // If no settings exist for this slot or no checkboxes are selected, show to all users
          if (!settings || (!settings.beginner && !settings.intermediate && !settings.advanced)) {
            return true;
          }

          // Match user's selection with slot admin's checkboxes
          if (userTajweedLevel === 'Beginner' && settings.beginner) return true;
          if (userTajweedLevel === 'Intermediate' && settings.intermediate) return true;
          if (userTajweedLevel === 'Advanced' && settings.advanced) return true;

          return false;
        });
      }

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
  }, [userTajweedLevel]);

  return { availableSlots, allSlots, loading, error, refetch: fetchSlotCounts };
};
