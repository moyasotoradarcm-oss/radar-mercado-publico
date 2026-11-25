import { abrirFichaOficial as abrirFichaOficialShared, cleanOfficialId, getFichaUrl as buildFichaUrl, handleOpenFichaSegura } from './openFicha';

export { cleanOfficialId, handleOpenFichaSegura };

export function getItemOfficialUrl(codigoOrItem: any): string {
  return getFichaUrl(codigoOrItem);
}

export function getFichaUrl(codigoOrItem: any): string {
  return buildFichaUrl(codigoOrItem);
}

export const abrirFichaOficial = abrirFichaOficialShared;

export function extractFechaCierre(item: any): string | null {
  if (!item) return null;
  return item.fecha_cierre || item.FechaCierre || item.fechaCierre || item.fechacierre || null;
}

export function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function parseChileDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  return parseDate(dateStr);
}

export function isItemExpired(item: any): boolean {
  const fecha = extractFechaCierre(item);
  if (!fecha) return false;
  return isExpired(fecha);
}

export function formatFechaLimpia(dateVal: any): string {
  if (!dateVal) return '-';

  if (typeof dateVal === 'string') {
    const raw = dateVal.trim();
    // Caso ISO: YYYY-MM-DDTHH:mm o YYYY-MM-DD HH:mm
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (isoMatch) {
      const [, yyyy, mm, dd, hh, min] = isoMatch;
      return `${dd}-${mm}-${yyyy.slice(-2)} : ${hh}:${min}`;
    }
    // Caso DD-MM-YYYYTHH:mm o DD/MM/YYYY HH:mm
    const ddmmyyyyMatch = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{2,4})[T\s](\d{2}):(\d{2})/);
    if (ddmmyyyyMatch) {
      const [, dd, mm, yyyy, hh, min] = ddmmyyyyMatch;
      return `${dd}-${mm}-${yyyy.slice(-2)} : ${hh}:${min}`;
    }
    // Caso ya formateado DD-MM-YY : HH:mm
    const alreadyFormatted = raw.match(/^(\d{2})-(\d{2})-(\d{2})\s*:\s*(\d{2}):(\d{2})$/);
    if (alreadyFormatted) {
      const [, dd, mm, yy, hh, min] = alreadyFormatted;
      return `${dd}-${mm}-${yy} : ${hh}:${min}`;
    }
    // Caso Date only: YYYY-MM-DD
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, yyyy, mm, dd] = dateOnlyMatch;
      return `${dd}-${mm}-${yyyy.slice(-2)} : 00:00`;
    }
    // Caso Date only: DD-MM-YYYY o DD/MM/YYYY
    const ddmmyyyyOnlyMatch = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{2,4})$/);
    if (ddmmyyyyOnlyMatch) {
      const [, dd, mm, yyyy] = ddmmyyyyOnlyMatch;
      return `${dd}-${mm}-${yyyy.slice(-2)} : 00:00`;
    }
  }

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} : ${hours}:${minutes}`;
  }

  return String(dateVal).replace('T', ' ');
}

export function formatChileDateTime(date: any): string {
  return formatFechaLimpia(date);
}

export function formatDate(date: any): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? String(date) : d.toLocaleDateString('es-CL');
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: any): string {
  if (!date) return '-';
  return formatFechaLimpia(date);
}

export function getDaysRemaining(targetDate: any): number {
  if (!targetDate) return 0;
  const target = new Date(targetDate);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateTimeRemaining(targetDate: any): { days: number; hours: number; minutes: number } {
  if (!targetDate) return { days: 0, hours: 0, minutes: 0 };
  const target = new Date(targetDate).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

export function calculateChileRemainingTime(targetDate: any): {
  days: number;
  dias: number;
  hours: number;
  horas: number;
  minutes: number;
  minutos: number;
  isExpired: boolean;
  expirada: boolean;
  badgeText: string;
} {
  const fallback = {
    days: 0,
    dias: 0,
    hours: 0,
    horas: 0,
    minutes: 0,
    minutos: 0,
    isExpired: true,
    expirada: true,
    badgeText: 'Vencida'
  };

  if (!targetDate) return fallback;
  const target = new Date(targetDate).getTime();
  if (isNaN(target)) return fallback;
  const now = new Date().getTime();
  const diff = target - now;

  if (diff <= 0) return fallback;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const badgeText = days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;

  return {
    days,
    dias: days,
    hours,
    horas: hours,
    minutes,
    minutos: minutes,
    isExpired: false,
    expirada: false,
    badgeText
  };
}

export function isExpiringSoon(targetDate: any, thresholdDays = 3): boolean {
  const days = getDaysRemaining(targetDate);
  return days >= 0 && days <= thresholdDays;
}

export function isExpired(targetDate: any): boolean {
  return getDaysRemaining(targetDate) < 0;
}