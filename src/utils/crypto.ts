// Utility functions for crypto hashing and Persian dates

export async function computeSHA256(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    // Fallback simple hash for older environments
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return "hash_" + Math.abs(hash).toString(16).padStart(16, "0");
  }
}

export function getPersianNow(): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString("fa-IR");
  }
}

export function generateCertNumber(): string {
  const year = "1405";
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `IR-JUD-${year}-${randomPart}`;
}

export function formatPersianNumbers(str: string | number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(str).replace(/[0-9]/g, (w) => persianDigits[+w]);
}
