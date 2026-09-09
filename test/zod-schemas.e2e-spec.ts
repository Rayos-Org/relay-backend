import {
  WebAuthnRegisterOptionsDtoSchema,
  WebAuthnVerifyAssertionDtoSchema,
} from "../src/common/schemas/webauthn.schema";

describe("Zod Schemas", () => {
  it("should invalidate missing userHandle in WebAuthnRegisterOptions", () => {
    const payload = {};
    const result = WebAuthnRegisterOptionsDtoSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(["userHandle"]);
    }
  });

  it("should validate valid WebAuthnRegisterOptions", () => {
    const payload = { userHandle: "user123", userName: "Test User" };
    const result = WebAuthnRegisterOptionsDtoSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should invalidate incorrect types in WebAuthnVerifyAssertion", () => {
    const payload = {
      userHandle: 123, // should be string
      response: {
        id: "id",
        rawId: "rawId",
        type: "public-key",
        response: {
          clientDataJSON: "cdj",
          authenticatorData: "ad",
          signature: "sig",
          userHandle: "uh",
        },
      },
    };
    const result = WebAuthnVerifyAssertionDtoSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
