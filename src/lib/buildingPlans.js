// Shared constants and helpers for the Civil Engineer / Building Plans module.

export const PLANS_TABLE = "building_plans";
export const PLANS_BUCKET = "building-plans";

export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "dwg",
  "dxf",
  "ifc",
  "png",
  "jpg",
  "jpeg",
  "webp",
];

export const PLAN_TYPES = [
  "Architectural",
  "Structural",
  "Foundation",
  "Electrical",
  "Plumbing",
  "HVAC / MEP",
  "Site Layout",
  "Elevation",
  "Section",
  "Floor Plan",
  "Other",
];

export const PLAN_STATUSES = ["Draft", "Under Review", "Approved", "Superseded"];

export const getFileExtension = (name = "") => {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
};

export const validatePlanFile = (file) => {
  if (!file) return "Please choose a plan file to upload.";

  const extension = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ").toUpperCase()}.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  return "";
};

export const formatFileSize = (bytes) => {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getStatusClass = (status) =>
  `bp-status bp-status--${(status || "draft")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")}`;
