import { describe, expect, it } from "vitest";
import { museumDemoSeed, ParticipantStore } from "./store.js";

describe("ParticipantStore", () => {
  it("adds, lists, updates, prunes, and removes", () => {
    const store = new ParticipantStore();
    expect(store.count()).toBe(0);

    const a = store.add({
      name: " Alex ",
      phone: " 555 ",
      email: " a@example.com ",
      languageIds: ["en", "es"],
      deliveryMode: "reveal",
    });
    expect(a.name).toBe("Alex");
    expect(a.phone).toBe("555");
    expect(store.list()).toHaveLength(1);

    const emailOnly = store.add({
      name: "Blake",
      languageIds: ["en"],
      deliveryMode: "send",
    });
    expect(emailOnly.phone).toBeUndefined();
    expect(emailOnly.email).toBeUndefined();

    expect(store.updateLanguages("missing", ["en"])).toBeNull();
    expect(store.updateDeliveryMode("missing", "send")).toBeNull();

    expect(store.updateLanguages(a.id, ["es"])?.languageIds).toEqual(["es"]);
    expect(store.updateDeliveryMode(a.id, "send")?.deliveryMode).toBe("send");

    store.pruneLanguages(new Set(["en"]));
    expect(store.list()[0]?.languageIds).toEqual([]);

    expect(store.remove("missing")).toBe(false);
    expect(store.remove(emailOnly.id)).toBe(true);
    expect(store.remove(a.id)).toBe(true);
    expect(store.count()).toBe(0);
  });

  it("resets with museum seed defaults", () => {
    const store = new ParticipantStore();
    store.reset([
      {
        id: "",
        name: "Pat",
        languageIds: undefined as unknown as string[],
        deliveryMode: undefined as unknown as "reveal",
      },
    ]);
    const [pat] = store.list();
    expect(pat?.id).toBeTruthy();
    expect(pat?.languageIds).toEqual([]);
    expect(pat?.deliveryMode).toBe("reveal");

    store.reset(museumDemoSeed());
    expect(store.count()).toBe(4);
  });
});
