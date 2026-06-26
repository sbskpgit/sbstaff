import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAssetUrl(url: string) {
  if (url && url.startsWith("/__l5e/")) {
    return `https://sbstaff.lovable.app${url}`;
  }
  return url;
}
