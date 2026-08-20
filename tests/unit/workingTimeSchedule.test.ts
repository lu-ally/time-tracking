import { describe, expect, it } from "vitest"
import { resolveScheduleForDate, targetMinutesForDate } from "../../lib/workingTimeSchedule"

const fullTime = {
  effectiveFrom: "1970-01-01",
  targetMinutesMon: 480,
  targetMinutesTue: 480,
  targetMinutesWed: 480,
  targetMinutesThu: 480,
  targetMinutesFri: 480,
  targetMinutesSat: 0,
  targetMinutesSun: 0
}

const partTime = {
  effectiveFrom: "2026-09-01",
  targetMinutesMon: 240,
  targetMinutesTue: 240,
  targetMinutesWed: 240,
  targetMinutesThu: 240,
  targetMinutesFri: 240,
  targetMinutesSat: 0,
  targetMinutesSun: 0
}

describe("workingTimeSchedule", () => {
  it("uses the schedule effective on a given date, not the latest one", () => {
    const schedules = [fullTime, partTime]
    expect(resolveScheduleForDate(schedules, "2026-08-31")).toBe(fullTime)
    expect(resolveScheduleForDate(schedules, "2026-09-01")).toBe(partTime)
    expect(resolveScheduleForDate(schedules, "2026-12-01")).toBe(partTime)
  })

  it("does not change historical target minutes when a later reduction is added", () => {
    const before = targetMinutesForDate([fullTime], "2026-08-15", 1)
    const after = targetMinutesForDate([fullTime, partTime], "2026-08-15", 1)
    expect(before).toBe(480)
    expect(after).toBe(480)
  })

  it("applies the reduced target minutes from the effective date onward", () => {
    expect(targetMinutesForDate([fullTime, partTime], "2026-09-02", 2)).toBe(240)
  })

  it("falls back to the earliest schedule for dates before any schedule", () => {
    expect(targetMinutesForDate([partTime], "2020-01-01", 1)).toBe(240)
  })

  it("returns 0 when there are no schedules at all", () => {
    expect(targetMinutesForDate([], "2026-01-01", 1)).toBe(0)
  })
})
