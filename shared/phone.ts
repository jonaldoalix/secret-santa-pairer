/** Strip non-digits and accept NANP 10-digit (or 11 with leading 1). */
export function normalizePhone(input: string): string | undefined {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return undefined;
}

export function formatPhoneDisplay(digits: string): string {
  if (digits.length !== 10) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
