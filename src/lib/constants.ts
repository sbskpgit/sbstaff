export const DUTY_STATUSES = [
  { value: "active", label: "Active Duty" },
  { value: "attached", label: "Attached" },
  { value: "osd", label: "OSD / Out Station" },
  { value: "headquarters", label: "Headquarters" },
  { value: "leave", label: "Leave" },
  { value: "suspension", label: "Suspension" },
  { value: "retired", label: "Retired" },
  { value: "vacant", label: "Vacant Seat" },
] as const;

export const POSTING_TYPES = [
  { value: "regional_office", label: "Regional Office" },
  { value: "district_office", label: "District Office" },
  { value: "circle_office", label: "Circle Office" },
  { value: "police_station", label: "Police Station" },
  { value: "headquarters", label: "Headquarters (HQ)" },
  { value: "attachment_in", label: "Attachment In" },
  { value: "attachment_out", label: "Attachment Out" },
  { value: "osd", label: "OSD / Out Station Duty" },
] as const;

export const TRANSFER_KINDS = [
  { value: "within_district", label: "Within District" },
  { value: "between_districts", label: "Between Districts" },
  { value: "to_region", label: "To Regional Office" },
  { value: "to_hq", label: "To Headquarters" },
  { value: "to_district_police", label: "To District Police" },
  { value: "attachment", label: "Attachment Order" },
  { value: "return_from_attachment", label: "Return from Attachment" },
  { value: "other", label: "Other" },
] as const;

export type DutyStatus = typeof DUTY_STATUSES[number]["value"];
export type PostingType = typeof POSTING_TYPES[number]["value"];
export type TransferKind = typeof TRANSFER_KINDS[number]["value"];

export function labelOf<T extends { value: string; label: string }>(arr: readonly T[], v: string | null | undefined) {
  return arr.find((x) => x.value === v)?.label ?? v ?? "—";
}
