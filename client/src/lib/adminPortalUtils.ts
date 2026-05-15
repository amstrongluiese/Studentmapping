export {
  parseStudentNumberTag,
  classifyAdmissionFromSchoolType,
  type AdmissionTypeLabel,
  type AdmissionDisplayLabel,
} from "@shared/gisClassification";

export function formatAdmissionLabel(
  admission: import("@shared/gisClassification").AdmissionTypeLabel | null | undefined,
): import("@shared/gisClassification").AdmissionDisplayLabel {
  return admission ?? "—";
}