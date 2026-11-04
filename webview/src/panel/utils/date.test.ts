import { describe, expect, it } from "vitest";
import { setLocale } from "../../shared/i18n";
import { formatCommitDate, formatFullDateTime } from "./date";

const NOW = new Date(2026, 10, 4, 12, 0); // 2026-11-04 12:00 local time

describe("formatCommitDate", () => {
  it("shows today with time", () => {
    expect(formatCommitDate("2026-11-04T09:05:00", NOW)).toBe("Today 09:05");
  });

  it("shows yesterday with time", () => {
    expect(formatCommitDate("2026-11-03T23:59:00", NOW)).toBe(
      "Yesterday 23:59",
    );
  });

  it("shows the full date for older commits", () => {
    expect(formatCommitDate("2026-11-02T17:18:00", NOW)).toBe(
      "2026/11/02 17:18",
    );
  });

  it("falls back to the raw value for invalid dates", () => {
    expect(formatCommitDate("not-a-date", NOW)).toBe("not-a-date");
  });

  it("localizes today/yesterday", () => {
    setLocale("zh-cn");
    expect(formatCommitDate("2026-11-04T09:05:00", NOW)).toBe("今天 09:05");
    expect(formatCommitDate("2026-11-03T23:59:00", NOW)).toBe("昨天 23:59");
    setLocale("en");
  });
});

describe("formatFullDateTime", () => {
  it("uses slashes and zero-padded time", () => {
    expect(formatFullDateTime("2026-01-02T03:04:00")).toBe("2026/01/02 03:04");
  });

  it("returns the input when unparsable", () => {
    expect(formatFullDateTime("nope")).toBe("nope");
  });
});
