import { z } from 'zod';

export const WebAuthnRegisterOptionsDtoSchema = z.object({
  userHandle: z.string().min(1),
  userName: z.string().min(1),
});

export type WebAuthnRegisterOptionsDto = z.infer<typeof WebAuthnRegisterOptionsDtoSchema>;

// The response from frontend is complex, we just validate it exists.
export const WebAuthnVerifyRegistrationDtoSchema = z.object({
  userHandle: z.string().min(1),
  response: z.any(),
});

export type WebAuthnVerifyRegistrationDto = z.infer<typeof WebAuthnVerifyRegistrationDtoSchema>;

export const WebAuthnAssertOptionsDtoSchema = z.object({
  userHandle: z.string().min(1),
});

export type WebAuthnAssertOptionsDto = z.infer<typeof WebAuthnAssertOptionsDtoSchema>;

export const WebAuthnVerifyAssertionDtoSchema = z.object({
  userHandle: z.string().min(1),
  response: z.any(),
});

export type WebAuthnVerifyAssertionDto = z.infer<typeof WebAuthnVerifyAssertionDtoSchema>;
