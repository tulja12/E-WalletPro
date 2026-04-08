const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10,15}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;
const CARD_PATTERN = /^[0-9]{12,19}$/;
const PIN_PATTERN = /^[0-9]{4}$/;
const OTP_PATTERN = /^[0-9]{6}$/;
const LETTERS_AND_SPACES_PATTERN = /^[A-Za-z ]+$/;

export function sanitizeUsername(value) {
  return value.trim();
}

export function sanitizeCardNumber(value) {
  return value.replace(/\D/g, "").slice(0, 19);
}

export function sanitizePhoneNumber(value) {
  return value.replace(/\D/g, "").slice(0, 15);
}

export function sanitizePin(value) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function sanitizeLettersOnly(value) {
  return value.replace(/[^A-Za-z ]/g, "");
}

export function validateLoginForm({ username, password }, options = {}) {
  const label = options.admin ? "admin username" : "username";
  const trimmedUsername = sanitizeUsername(username);

  if (!trimmedUsername) {
    return `Enter your ${label}`;
  }

  if (!USERNAME_PATTERN.test(trimmedUsername)) {
    return `Enter a valid ${label}`;
  }

  if (!password) {
    return "Enter your password";
  }

  if (password.length <= 4) {
    return "Password must be at least 4 characters";
  }

  return "";
}

export function validateSignupForm(form) {
  if (!form.name.trim()) {
    return "Enter your full name";
  }

  if (!EMAIL_PATTERN.test(form.email.trim())) {
    return "Enter a valid email address";
  }

  if (!PHONE_PATTERN.test(form.phone.trim())) {
    return "Enter a valid phone number";
  }

  if (!USERNAME_PATTERN.test(sanitizeUsername(form.username))) {
    return "Username must be 3 to 30 characters and use only letters, numbers, dot, underscore, or hyphen";
  }

  if (!form.passkey || form.passkey.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (form.passkey !== form.confirmPassword) {
    return "Passwords do not match";
  }

  return "";
}

export function validateBankAccountForm(form) {
  if (!form.bankName.trim()) {
    return "Enter the bank name";
  }

  if (!LETTERS_AND_SPACES_PATTERN.test(form.bankName.trim())) {
    return "Bank name can contain only letters and spaces";
  }

  if (!CARD_PATTERN.test(sanitizeCardNumber(form.cardNumber))) {
    return "Card number must contain 12 to 19 digits";
  }

  if (!form.accountHolder.trim()) {
    return "Enter the account holder name";
  }

  if (!LETTERS_AND_SPACES_PATTERN.test(form.accountHolder.trim())) {
    return "Account holder can contain only letters and spaces";
  }

  if ((!form.id || form.pinConfigured === false) && !form.pin.trim()) {
    return "Enter a 4-digit account PIN";
  }

  if (form.pin.trim() && !PIN_PATTERN.test(form.pin.trim())) {
    return "Account PIN must be exactly 4 digits";
  }

  const amountError = validateAmount(form.balance, "Initial balance", { allowZero: true });
  return amountError;
}

export function validateAmount(value, label = "Amount", options = {}) {
  const numericValue = Number(value);
  const allowZero = Boolean(options.allowZero);

  if (value === "" || value === null || value === undefined) {
    return `${label} is required`;
  }

  if (Number.isNaN(numericValue)) {
    return `Enter a valid ${label.toLowerCase()}`;
  }

  if (allowZero ? numericValue < 0 : numericValue <= 0) {
    return allowZero
      ? `${label} cannot be negative`
      : `${label} must be greater than zero`;
  }

  return "";
}

export function validateUserTransfer({ receiverUsername, amount, currentUsername }) {
  const trimmedReceiver = sanitizeUsername(receiverUsername);
  if (!trimmedReceiver) {
    return "Enter the recipient username";
  }

  if (!USERNAME_PATTERN.test(trimmedReceiver)) {
    return "Enter a valid recipient username";
  }

  if (trimmedReceiver === currentUsername) {
    return "Cannot send money to your own account";
  }

  return validateAmount(amount);
}

export function validateSelfTransfer({ fromAccount, toAccount, amount }) {
  if (!fromAccount) {
    return "Select the source account";
  }

  if (!toAccount) {
    return "Select the destination account";
  }

  if (String(fromAccount) === String(toAccount)) {
    return "Cannot transfer to the same account";
  }

  return validateAmount(amount);
}

export function validateAccountPin(value, label = "Account PIN") {
  if (!value.trim()) {
    return `${label} is required`;
  }

  if (!PIN_PATTERN.test(value.trim())) {
    return `${label} must be exactly 4 digits`;
  }

  return "";
}

export function validateEmail(value) {
  if (!value.trim()) {
    return "Enter an email address";
  }

  if (!EMAIL_PATTERN.test(value.trim())) {
    return "Enter a valid email address";
  }

  return "";
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return "Fill all password fields";
  }

  if (newPassword.length <= 4 ) {
    return "New password must be at least 4 characters";
  }

  if (newPassword !== confirmPassword) {
    return "Passwords do not match";
  }

  if (currentPassword === newPassword) {
    return "New password must be different from the current password";
  }

  return "";
}

export function validateOtp(value) {
  if (!OTP_PATTERN.test(value.trim())) {
    return "Enter a valid 6-digit OTP";
  }

  return "";
}
