export type WorkingTimeScheduleRecord = {
  effectiveFrom: string
  targetMinutesMon: number
  targetMinutesTue: number
  targetMinutesWed: number
  targetMinutesThu: number
  targetMinutesFri: number
  targetMinutesSat: number
  targetMinutesSun: number
}

export function targetMinutesForWeekday(schedule: WorkingTimeScheduleRecord, weekday: number): number {
  const map = [
    schedule.targetMinutesSun,
    schedule.targetMinutesMon,
    schedule.targetMinutesTue,
    schedule.targetMinutesWed,
    schedule.targetMinutesThu,
    schedule.targetMinutesFri,
    schedule.targetMinutesSat
  ]
  return map[weekday]
}

export function resolveScheduleForDate<T extends WorkingTimeScheduleRecord>(
  schedules: T[],
  dateKey: string
): T | null {
  let best: T | null = null
  let earliest: T | null = null
  for (const schedule of schedules) {
    if (!earliest || schedule.effectiveFrom < earliest.effectiveFrom) earliest = schedule
    if (schedule.effectiveFrom <= dateKey && (!best || schedule.effectiveFrom > best.effectiveFrom)) {
      best = schedule
    }
  }
  return best ?? earliest
}

export function targetMinutesForDate(
  schedules: WorkingTimeScheduleRecord[],
  dateKey: string,
  weekday: number
): number {
  const schedule = resolveScheduleForDate(schedules, dateKey)
  if (!schedule) return 0
  return targetMinutesForWeekday(schedule, weekday)
}
