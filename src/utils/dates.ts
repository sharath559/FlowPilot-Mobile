export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function calculateAge(dateOfBirth?: string | null, atDate: Date = new Date()): number | null {
  if (!dateOfBirth || !isValidDateString(dateOfBirth)) {
    return null;
  }

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  let age = atDate.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    atDate.getMonth() > birthDate.getMonth() ||
    (atDate.getMonth() === birthDate.getMonth() && atDate.getDate() >= birthDate.getDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function formatDateLabel(value?: string | null): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
