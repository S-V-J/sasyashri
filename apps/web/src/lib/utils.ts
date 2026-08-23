import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR', locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatDate(date: Date | string, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}

export function calculateDiscount(price: number, discountPercent: number): number {
  return Math.round(price * (discountPercent / 100) * 100) / 100;
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)}*****`;
  }
  return phone;
}

export function getRoleDisplayName(role: string, locale = 'en'): string {
  const roles: Record<string, { en: string; hi: string }> = {
    BUYER: { en: 'Buyer', hi: 'खरीदार' },
    SELLER: { en: 'Seller', hi: 'विक्रेता' },
    FARMER: { en: 'Farmer', hi: 'किसान' },
    FINANCIER: { en: 'Financier', hi: 'निवेशक' },
    SALES_AGENT: { en: 'Sales Agent', hi: 'सेल्स एजेंट' },
    TRANSPORTER: { en: 'Transporter', hi: 'परिवहनकर्ता' },
    QUALITY_LAB: { en: 'Quality Lab', hi: 'गुणवत्ता लैब' },
    ADMIN: { en: 'Admin', hi: 'एडमिन' },
  };
  return roles[role]?.[locale] || role;
}

export function getProductCategoryDisplayName(category: string, locale = 'en'): string {
  const categories: Record<string, { en: string; hi: string }> = {
    ANAAJ: { en: 'Food Grains', hi: 'अनाज' },
    MASALA: { en: 'Spices', hi: 'मसाले' },
  };
  return categories[category]?.[locale] || category;
}

export function getProductConditionDisplayName(condition: string, locale = 'en'): string {
  const conditions: Record<string, { en: string; hi: string }> = {
    KACCHA: { en: 'Raw', hi: 'कच्चा' },
    TAYYAR: { en: 'Processed', hi: 'तैयार' },
    AVASHEH: { en: 'Byproducts', hi: 'अवशेष' },
    GHARELU: { en: 'Household', hi: 'घरेलू' },
  };
  return conditions[condition]?.[locale] || condition;
}

export function getStockUnitDisplayName(unit: string, locale = 'en'): string {
  const units: Record<string, { en: string; hi: string }> = {
    KG: { en: 'kg', hi: 'किग्रा' },
    QUINTAL: { en: 'quintal', hi: 'क्विंटल' },
    TONNE: { en: 'tonne', hi: 'टन' },
    BAG: { en: 'bag', hi: 'बोरी' },
    SACK: { en: 'sack', hi: 'बोरा' },
    CRATE: { en: 'crate', hi: 'क्रेट' },
    BUNDLE: { en: 'bundle', hi: 'गट्ठर' },
    PIECE: { en: 'piece', hi: 'टुकड़ा' },
    LITRE: { en: 'litre', hi: 'लीटर' },
    CUSTOM: { en: 'custom', hi: 'कस्टम' },
  };
  return units[unit]?.[locale] || unit;
}