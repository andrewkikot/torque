import { describe, expect, it } from "vitest";
import { parseMileage, parseCommand, localeFromTelegram } from "@/lib/bot/parse";

describe("parseMileage", () => {
  it.each([
    ["84500", 84500],
    ["84 500", 84500],
    ["84,500", 84500],
    ["84k", 84000],
    ["84.5k", 84500],
    ["84,5 тис", 84500],
    ["123 456 km", 123456],
    ["91200 км", 91200],
  ])("%s → %d", (input, expected) => {
    expect(parseMileage(input)).toBe(expected);
  });
  it.each(["", "abc", "12a", "99999999"])("rejects %s", (input) => {
    expect(parseMileage(input)).toBeNull();
  });
});

describe("parseCommand", () => {
  it("parses commands with bot suffix and args", () => {
    expect(parseCommand("/km@TorqueBot 84500")).toEqual({ command: "km", args: "84500" });
    expect(parseCommand("/due")).toEqual({ command: "due", args: "" });
    expect(parseCommand("hello")).toBeNull();
  });
});

describe("localeFromTelegram", () => {
  it("maps Ukrainian/Russian to uk", () => {
    expect(localeFromTelegram("uk")).toBe("uk");
    expect(localeFromTelegram("ru")).toBe("uk");
    expect(localeFromTelegram("en-US")).toBe("en");
    expect(localeFromTelegram(undefined)).toBe("en");
  });
});
