import { describe, expect, it } from "vitest"
import { workMinutes, leaveDaysUsed } from "../../lib/calculations"
import { hamburgHolidays } from "../../lib/holidays"

describe("calculations", () => {
  it("calculates work minutes", () => {
    expect(workMinutes({ startMinutes: 540, endMinutes: 1020, breakMinutes: 30 })).toBe(450)
  })

  it("calculates leave days excluding holidays", () => {
    const holidays = hamburgHolidays(2026)
    const days = leaveDaysUsed("2026-05-01", "2026-05-02", false, false, holidays)
    expect(days).toBe(0)
  })
})
