import { describe, expect, it } from "vitest";

import { ageOnDate } from "@/lib/capsule-landing-data";

describe("ageOnDate", () => {
  it("returns null when DOB is missing", () => {
    expect(ageOnDate(null, new Date("2040-01-01"))).toBeNull();
  });

  it("returns null when reveal date is missing", () => {
    expect(ageOnDate(new Date("2020-01-01"), null)).toBeNull();
  });

  it("returns the simple year difference when the month matches exactly", () => {
    expect(
      ageOnDate(new Date("2020-06-14"), new Date("2038-06-14")),
    ).toBe(18);
  });

  it("subtracts a year when the reveal month is before the birth month", () => {
    expect(
      ageOnDate(new Date("2020-06-14"), new Date("2038-05-14")),
    ).toBe(17);
  });

  it("subtracts a year when same month but earlier day", () => {
    expect(
      ageOnDate(new Date("2020-06-14"), new Date("2038-06-13")),
    ).toBe(17);
  });

  it("returns null when reveal precedes DOB (shouldn't happen, defensive)", () => {
    expect(
      ageOnDate(new Date("2020-06-14"), new Date("2015-01-01")),
    ).toBeNull();
  });
});
