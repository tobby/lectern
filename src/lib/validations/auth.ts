export interface SignupInput {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateSignup(data: unknown): {
  valid: boolean;
  error?: string;
  data?: SignupInput;
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { fullName, email, password } = data as Record<string, unknown>;

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return { valid: false, error: "Full name must be at least 2 characters" };
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return { valid: false, error: "Invalid email address" };
  }

  if (
    !password ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  return {
    valid: true,
    data: { fullName: fullName.trim(), email: email.toLowerCase().trim(), password },
  };
}

export function validateLogin(data: unknown): {
  valid: boolean;
  error?: string;
  data?: LoginInput;
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { email, password } = data as Record<string, unknown>;

  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  return {
    valid: true,
    data: { email: email.toLowerCase().trim(), password },
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
