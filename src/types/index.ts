export interface Biomarker {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  flag: "high" | "low" | "normal";
}

export interface Panel {
  name: string;
  biomarkers: Biomarker[];
}

export interface LabResult {
  id: string;
  dateCollected: string;
  dateReported: string;
  panels: Panel[];
  fasting: boolean;
}

export interface HealthNote {
  id: string;
  date: string;
  title: string;
  content: string;
}

export interface UserProfile {
  name: string;
  dob: string;
  sex: string;
}

export interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
  };
}
