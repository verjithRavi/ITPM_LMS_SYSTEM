export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{10}$/;
export const FULL_NAME_REGEX = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

export function validateRequired(value: string) {
  return value.trim() ? "" : "This field is required.";
}

export function validateFullName(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "This field is required.";
  return FULL_NAME_REGEX.test(trimmedValue)
    ? ""
    : "Name must contain letters only. Spaces, apostrophes, and hyphens are allowed.";
}

export function validateEmail(value: string) {
  if (!value.trim()) return "This field is required.";
  return EMAIL_REGEX.test(value.trim()) ? "" : "Enter a valid email address like example@gmail.com.";
}

export function validatePhoneNumber(value: string) {
  if (!value.trim()) return "This field is required.";
  return PHONE_REGEX.test(value.trim()) ? "" : "Phone number must contain exactly 10 digits.";
}

export function validatePassword(value: string) {
  if (!value.trim()) return "This field is required.";
  return value.length >= 6 ? "" : "Password must be at least 6 characters.";
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword.trim()) return "This field is required.";
  return password === confirmPassword ? "" : "Password and confirm password do not match.";
}

export function validateIdentifier(value: string) {
  if (!value.trim()) return "This field is required.";
  if (value.includes("@") && !EMAIL_REGEX.test(value.trim())) {
    return "Enter a valid email address like example@gmail.com.";
  }
  return "";
}
