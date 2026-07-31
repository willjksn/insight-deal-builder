import { describe, expect, it } from "vitest";
import {
  buildCreatorConnectNudgeEmail,
  buildCreatorPaidEmail,
} from "@/lib/creators/creatorPayoutEmail";

describe("buildCreatorPaidEmail", () => {
  it("mentions amount and campaign", () => {
    const mail = buildCreatorPaidEmail({
      professionalName: "Ada",
      campaignName: "Brand Reel",
      amount: 750,
      paidVia: "stripe",
    });
    expect(mail.subject).toContain("Brand Reel");
    expect(mail.text).toContain("Ada");
    expect(mail.text).toContain("Brand Reel");
    expect(mail.text.toLowerCase()).toContain("stripe");
    expect(mail.html).toContain("View your campaigns");
  });
});

describe("buildCreatorConnectNudgeEmail", () => {
  it("links to payment setup", () => {
    const mail = buildCreatorConnectNudgeEmail({ professionalName: "Ada" });
    expect(mail.subject.toLowerCase()).toContain("stripe");
    expect(mail.text).toContain("/creator-portal/payment");
    expect(mail.html).toContain("Open payment setup");
  });
});
