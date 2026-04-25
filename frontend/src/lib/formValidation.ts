export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{10}$/;

export function validateRequired(value: string) {
  return value.trim() ? "" : "This field is required.";
}

export function validateEmail(value: string) {
  if (!value.trim()) return "This field is required.";
  return EMAIL_REGEX.test(value.trim()) ? "" : "Enter a valid email address like example@gmail.com.";
}

export function validatePhoneNumber(value: string) {
  if (!value.trim()) return "This field is required.";
  return PHONE_REGEX.test(value.trim()) ? "" : "Phone number must contain exactly 10 digits.";
}

export function validateIdentifier(value: string) {
  if (!value.trim()) return "This field is required.";
  if (value.includes("@") && !EMAIL_REGEX.test(value.trim())) {
    return "Enter a valid email address like example@gmail.com.";
  }
  return "";
}
