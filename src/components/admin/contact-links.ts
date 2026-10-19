/** Digits only, with the India country code added when a 10-digit local number is given. */
export function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(phone: string, name?: string): string {
  const text = name
    ? `Hi ${name.split(" ")[0]}, thank you for contacting ShubhKaaraj. We would love to hear more about your event.`
    : "";
  return `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}
