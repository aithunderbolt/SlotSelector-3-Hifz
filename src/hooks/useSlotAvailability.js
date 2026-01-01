import { useState, useEffect, useRef, useCallback } from 'react';
import { pb } from '../lib/supabaseClient';

export const useSlotAvailability = (userTajweedLevel = null) => {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cache to avoid unnecessary refetches
  const cacheRef = useRef({
    slots: null,
    users: null,
    registrations: null,
    timestamp: 0
  });
  
  // Debounce refetch to avoid multiple rapid calls
  const refetchTimeoutRef = useRef(null);

  const fetchSlotCounts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      const now = Date.now();
      const cacheAge = now - cacheRef.current.timestamp;
      const useCache = !forceRefresh && cacheAge < 5000; // 5 second cache

      // Fetch all data in parallel for better performance
      const [slotsData, usersData, registrationsData] = await Promise.all([
        useCache && cacheRef.current.slots 
          ? Promise.resolve(cacheRef.current.slots)
          : pb.collection('slots').getList(1, 50, { sort: 'slot_order' }).then(res => res.items),
        useCache && cacheRef.current.users
          ? Promise.resolve(cacheRef.current.users)
          : pb.collection('users').getList(1, 50, {
              filter: 'role = "slot_admin"',
              fields: 'id,assigned_slot_id,tajweed_beginner,tajweed_intermediate,tajweed_advanced',
            }).then(res => res.items),
        useCache && cacheRef.current.registrations
          ? Promise.resolve(cacheRef.current.registrations)
          : pb.collection('registrations').getList(1, 500, { fields: 'id,slot_id' }).then(res => res.items)
      ]);

      // Update cache
      cacheRef.current = {
        slots: slotsData,
        users: usersData,
        registrations: registrationsData,
        timestamp: now
      };

      setAllSlots(slotsData);

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
  }, [userTajweedLevel]);

  // Debounced refetch for subscriptions
  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      fetchSlotCounts(true);
    }, 500); // Wait 500ms before refetching
  }, [fetchSlotCounts]);

  useEffect(() => {
    fetchSlotCounts(true);

    // Subscribe to registrations changes with debouncing
    pb.collection('registrations').subscribe('*', debouncedRefetch);

    // Subscribe to slots changes with debouncing
    pb.collection('slots').subscribe('*', debouncedRefetch);

    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      pb.collection('registrations').unsubscribe();
      pb.collection('slots').unsubscribe();
    };
  }, [userTajweedLevel, fetchSlotCounts, debouncedRefetch]);

  return { availableSlots, allSlots, loading, error, refetch: () => fetchSlotCounts(true) };
};
