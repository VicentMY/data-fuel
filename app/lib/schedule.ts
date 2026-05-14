/**
 * Parses Spanish schedule strings from MINETUR API and checks if currently open.
 * Formats: "L-D: 24H", "L-S: 08:00-22:00; D: 09:00-21:00", etc.
 */
export function isOpenNow(horario: string): boolean {
  if (!horario) return false;
  if (horario.toUpperCase().includes("24H")) return true;

  const now = new Date();
  const day = now.getDay(); // 0 (Sun) to 6 (Sat)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Spanish mapping: L(1), M(2), X(3), J(4), V(5), S(6), D(0)
  const dayMap: Record<string, number> = {
    'L': 1, 'M': 2, 'X': 3, 'J': 4, 'V': 5, 'S': 6, 'D': 0
  };

  const segments = horario.split(";").map(s => s.trim());
  
  for (const segment of segments) {
    const parts = segment.split(":");
    if (parts.length < 2) continue;
    
    const daysPart = parts[0].trim().toUpperCase();
    const hoursPart = parts.slice(1).join(":").trim().toUpperCase();

    let dayMatch = false;
    if (daysPart.includes("-")) {
      const [startDayChar, endDayChar] = daysPart.split("-").map(d => d.trim());
      const startDay = dayMap[startDayChar];
      const endDay = dayMap[endDayChar];
      
      if (startDay !== undefined && endDay !== undefined) {
        if (startDay <= endDay) {
          dayMatch = day >= startDay && day <= endDay;
        } else {
          dayMatch = day >= startDay || day <= endDay;
        }
      }
    } else {
      dayMatch = day === dayMap[daysPart];
    }

    if (dayMatch) {
      if (hoursPart.includes("24H")) return true;
      
      const ranges = hoursPart.split(",").map(r => r.trim());
      for (const range of ranges) {
        const [startStr, endStr] = range.split("-").map(t => t.trim());
        if (!startStr || !endStr) continue;

        const [startH, startM] = startStr.split(":").map(Number);
        const [endH, endM] = endStr.split(":").map(Number);
        
        if (isNaN(startH) || isNaN(endH)) continue;

        const startMin = startH * 60 + (startM || 0);
        const endMin = endH * 60 + (endM || 0);

        if (endMin < startMin) { // Crosses midnight
          if (currentMinutes >= startMin || currentMinutes < endMin) return true;
        } else {
          if (currentMinutes >= startMin && currentMinutes < endMin) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks if the given date is the same calendar day as today.
 */
export function isUpdatedToday(updatedAt: string | Date | null): boolean {
  if (!updatedAt) return false;
  const date = new Date(updatedAt);
  const now = new Date();
  return date.getDate() === now.getDate() &&
         date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
}
