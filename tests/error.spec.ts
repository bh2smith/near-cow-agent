import { withRedactedErrorHandling } from "@/src/lib/error";

describe("withRedactedErrorHandling", () => {
  let originalLog: typeof console.error;

  beforeAll(() => {
    originalLog = console.error;
    console.error = () => {}; // no-op
  });

  afterAll(() => {
    console.error = originalLog; // restore
  });

  it("redacts Alchemy API key in error message", async () => {
    const fakeKey = "44HGnFnWWHloMHhA7777jSjLwV9P8Dk6";
    const originalUrl = `https://base-mainnet.g.alchemy.com/v2/${fakeKey}`;
    const throwingFunction = () =>
      Promise.reject(new Error(`Call failed at ${originalUrl}`));

    await expect(withRedactedErrorHandling(throwingFunction())).rejects.toThrow(
      `https://base-mainnet.g.alchemy.com/v2/<REDACTED>`,
    );
  });

  it("does not redact unrelated errors", async () => {
    const errorMessage = "Something else went wrong";
    const throwingFunction = () => Promise.reject(new Error(errorMessage));

    await expect(withRedactedErrorHandling(throwingFunction())).rejects.toThrow(
      errorMessage,
    );
  });
});
