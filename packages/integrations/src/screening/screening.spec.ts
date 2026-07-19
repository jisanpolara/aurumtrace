import { ProviderError } from "../common/resilience";
import { HttpScreeningAdapter } from "./http";
import { MockScreeningAdapter } from "./mock";

const subject = { fullName: "Test Person" };

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as unknown as Response;
}

describe("MockScreeningAdapter", () => {
  it("returns a clean, identity-verified outcome", async () => {
    const r = await new MockScreeningAdapter().screen(subject);
    expect(r).toMatchObject({
      sanctionsMatch: false,
      pepMatch: false,
      adverseMedia: false,
      identityVerified: true,
      source: "mock",
    });
  });
});

describe("HttpScreeningAdapter", () => {
  it("maps a provider response to the normalised outcome", async () => {
    const fetchImpl = jest.fn(async () =>
      okResponse({
        sanctions_match: true,
        pep_match: false,
        adverse_media: true,
        identity_verified: true,
        hits: [{ list: "UN", name: "Test Person", score: 0.92 }],
      }),
    );
    const r = await new HttpScreeningAdapter({ endpoint: "https://x", fetchImpl }).screen(subject);
    expect(r.sanctionsMatch).toBe(true);
    expect(r.adverseMedia).toBe(true);
    expect(r.hits).toEqual([{ list: "UN", matchName: "Test Person", score: 0.92 }]);
    expect(r.source).toBe("opensanctions");
  });

  it("raises ProviderError on an unexpected response shape", async () => {
    const fetchImpl = jest.fn(async () => okResponse({ nope: true }));
    await expect(
      new HttpScreeningAdapter({ endpoint: "https://x", fetchImpl, resilience: { retries: 0 } }).screen(
        subject,
      ),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});
