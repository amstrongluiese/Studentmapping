import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function inferSchoolType(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.includes('university') || lower.includes('univ')) return 'University';
  if (lower.includes('college') || lower.includes('coll')) return 'College';
  if (lower.includes('senior high') || lower.includes('shs')) return 'Senior High School';
  if (lower.includes('high school') || lower.includes('nhs') || lower.includes('jhs') || lower.includes('academy') || lower.includes('institute')) return 'High School';
  if (lower.includes('elementary') || lower.includes('es') || lower.includes('school')) return 'Elementary';
  return undefined;
}
