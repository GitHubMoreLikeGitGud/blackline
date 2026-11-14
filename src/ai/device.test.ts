import { describe, expect, it } from "vitest";
import { availabilityFrom } from "./device.ts";

describe("availabilityFrom", () => {
  it("accepts Chrome's LanguageModel class, whose typeof is function", async () => {
    class FakeLanguageModel {
      static async availability(): Promise<string> {
        return "downloadable";
      }
    }
    const availability = availabilityFrom(FakeLanguageModel);
    expect(availability).not.toBeNull();
    expect(await availability?.()).toBe("downloadable");
  });

  it("accepts a plain object with an availability method", async () => {
    const availability = availabilityFrom({ availability: async () => "available" });
    expect(await availability?.()).toBe("available");
  });

  it("rejects values without a callable availability", () => {
    expect(availabilityFrom(undefined)).toBeNull();
    expect(availabilityFrom(null)).toBeNull();
    expect(availabilityFrom({})).toBeNull();
    expect(availabilityFrom({ availability: "yes" })).toBeNull();
    expect(availabilityFrom(() => "no static method")).toBeNull();
  });
});
