import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function flag(value: number, min?: number, max?: number): string {
  if (max !== undefined && value > max) return "HIGH";
  if (min !== undefined && value < min) return "LOW";
  return "NORMAL";
}

interface SeedBiomarker {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

interface SeedPanel {
  name: string;
  biomarkers: SeedBiomarker[];
}

interface SeedLabResult {
  dateCollected: string;
  dateReported: string;
  fasting: boolean;
  panels: SeedPanel[];
}

const labResults: SeedLabResult[] = [
  {
    dateCollected: "2026-01-29",
    dateReported: "2026-02-05",
    fasting: false,
    panels: [
      {
        name: "Thyroid",
        biomarkers: [
          { name: "TSH", value: 1.33, unit: "uIU/mL", referenceMin: 0.45, referenceMax: 4.5 },
          { name: "Free T4", value: 1.24, unit: "ng/dL", referenceMin: 0.82, referenceMax: 1.77 },
          { name: "Free T3", value: 3.7, unit: "pg/mL", referenceMin: 2.0, referenceMax: 4.4 },
        ],
      },
      {
        name: "CBC",
        biomarkers: [
          { name: "WBC", value: 5.0, unit: "x10E3/uL", referenceMin: 3.4, referenceMax: 10.8 },
          { name: "RBC", value: 5.68, unit: "x10E6/uL", referenceMin: 4.14, referenceMax: 5.8 },
          { name: "Hemoglobin", value: 16.0, unit: "g/dL", referenceMin: 13.0, referenceMax: 17.7 },
          { name: "Hematocrit", value: 50.1, unit: "%", referenceMin: 37.5, referenceMax: 51.0 },
          { name: "Platelets", value: 317, unit: "x10E3/uL", referenceMin: 150, referenceMax: 450 },
          { name: "MCV", value: 88, unit: "fL", referenceMin: 79, referenceMax: 97 },
        ],
      },
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Glucose", value: 102, unit: "mg/dL", referenceMin: 70, referenceMax: 99 },
          { name: "BUN", value: 11, unit: "mg/dL", referenceMin: 6, referenceMax: 20 },
          { name: "Creatinine", value: 1.01, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 106, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "Sodium", value: 142, unit: "mmol/L", referenceMin: 134, referenceMax: 144 },
          { name: "Potassium", value: 4.9, unit: "mmol/L", referenceMin: 3.5, referenceMax: 5.2 },
          { name: "Calcium", value: 9.7, unit: "mg/dL", referenceMin: 8.7, referenceMax: 10.2 },
          { name: "Protein, Total", value: 7.4, unit: "g/dL", referenceMin: 6.0, referenceMax: 8.5 },
          { name: "Albumin", value: 5.1, unit: "g/dL", referenceMin: 4.3, referenceMax: 5.2 },
          { name: "Bilirubin, Total", value: 0.4, unit: "mg/dL", referenceMin: 0.0, referenceMax: 1.2 },
          { name: "Alk Phos", value: 60, unit: "IU/L", referenceMin: 47, referenceMax: 123 },
          { name: "AST", value: 27, unit: "IU/L", referenceMin: 0, referenceMax: 40 },
          { name: "ALT", value: 28, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
      {
        name: "Lipid Panel",
        biomarkers: [
          { name: "Total Cholesterol", value: 180, unit: "mg/dL", referenceMin: 100, referenceMax: 199 },
          { name: "Triglycerides", value: 121, unit: "mg/dL", referenceMin: 0, referenceMax: 149 },
          { name: "HDL", value: 40, unit: "mg/dL", referenceMin: 39 },
          { name: "LDL", value: 118, unit: "mg/dL", referenceMin: 0, referenceMax: 99 },
          { name: "VLDL", value: 22, unit: "mg/dL", referenceMin: 5, referenceMax: 40 },
          { name: "LDL/HDL Ratio", value: 3.0, unit: "ratio", referenceMin: 0, referenceMax: 3.6 },
          { name: "Apolipoprotein B", value: 94, unit: "mg/dL", referenceMin: 0, referenceMax: 90 },
        ],
      },
      {
        name: "Hormones",
        biomarkers: [
          { name: "Testosterone, Total", value: 1499.2, unit: "ng/dL", referenceMin: 264, referenceMax: 916 },
          { name: "SHBG", value: 54.8, unit: "nmol/L", referenceMin: 16.5, referenceMax: 55.9 },
          { name: "Testosterone, Free", value: 267.5, unit: "pg/mL", referenceMin: 47.7, referenceMax: 173.9 },
          { name: "Estradiol", value: 19.9, unit: "pg/mL", referenceMin: 8.0, referenceMax: 35.0 },
          { name: "DHEA", value: 266, unit: "ng/dL", referenceMin: 31, referenceMax: 701 },
          { name: "Pregnenolone", value: 14, unit: "ng/dL", referenceMin: 0, referenceMax: 151 },
        ],
      },
      {
        name: "Metabolic Markers",
        biomarkers: [
          { name: "HbA1c", value: 5.1, unit: "%", referenceMin: 4.8, referenceMax: 5.6 },
          { name: "Insulin", value: 26.4, unit: "uIU/mL", referenceMin: 2.6, referenceMax: 24.9 },
          { name: "CRP, Cardiac", value: 0.89, unit: "mg/L", referenceMin: 0, referenceMax: 3.0 },
          { name: "GGT", value: 27, unit: "IU/L", referenceMin: 0, referenceMax: 65 },
        ],
      },
      {
        name: "Other",
        biomarkers: [
          { name: "PSA", value: 0.9, unit: "ng/mL", referenceMin: 0, referenceMax: 4.0 },
          { name: "VEGF", value: 522, unit: "pg/mL", referenceMin: 62, referenceMax: 707 },
        ],
      },
    ],
  },
  {
    dateCollected: "2025-01-06",
    dateReported: "2025-01-10",
    fasting: true,
    panels: [
      {
        name: "Thyroid",
        biomarkers: [
          { name: "TSH", value: 3.03, unit: "uIU/mL", referenceMin: 0.45, referenceMax: 4.5 },
          { name: "Free T4", value: 1.44, unit: "ng/dL", referenceMin: 0.82, referenceMax: 1.77 },
          { name: "Free T3", value: 3.7, unit: "pg/mL", referenceMin: 2.0, referenceMax: 4.4 },
        ],
      },
      {
        name: "CBC",
        biomarkers: [
          { name: "WBC", value: 6.2, unit: "x10E3/uL", referenceMin: 3.4, referenceMax: 10.8 },
          { name: "RBC", value: 5.75, unit: "x10E6/uL", referenceMin: 4.14, referenceMax: 5.8 },
          { name: "Hemoglobin", value: 16.9, unit: "g/dL", referenceMin: 13.0, referenceMax: 17.7 },
          { name: "Hematocrit", value: 49.0, unit: "%", referenceMin: 37.5, referenceMax: 51.0 },
          { name: "Platelets", value: 218, unit: "x10E3/uL", referenceMin: 150, referenceMax: 450 },
          { name: "MCV", value: 85, unit: "fL", referenceMin: 79, referenceMax: 97 },
        ],
      },
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Glucose", value: 94, unit: "mg/dL", referenceMin: 70, referenceMax: 99 },
          { name: "BUN", value: 17, unit: "mg/dL", referenceMin: 6, referenceMax: 20 },
          { name: "Creatinine", value: 1.13, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 93, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "Sodium", value: 140, unit: "mmol/L", referenceMin: 134, referenceMax: 144 },
          { name: "Potassium", value: 4.8, unit: "mmol/L", referenceMin: 3.5, referenceMax: 5.2 },
          { name: "Calcium", value: 9.9, unit: "mg/dL", referenceMin: 8.7, referenceMax: 10.2 },
          { name: "AST", value: 21, unit: "IU/L", referenceMin: 0, referenceMax: 40 },
          { name: "ALT", value: 26, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
      {
        name: "Lipid Panel",
        biomarkers: [
          { name: "Total Cholesterol", value: 118, unit: "mg/dL", referenceMin: 100, referenceMax: 199 },
          { name: "Triglycerides", value: 79, unit: "mg/dL", referenceMin: 0, referenceMax: 149 },
          { name: "HDL", value: 42, unit: "mg/dL", referenceMin: 39 },
          { name: "LDL", value: 60, unit: "mg/dL", referenceMin: 0, referenceMax: 99 },
          { name: "VLDL", value: 16, unit: "mg/dL", referenceMin: 5, referenceMax: 40 },
          { name: "Apolipoprotein B", value: 58, unit: "mg/dL", referenceMin: 0, referenceMax: 90 },
        ],
      },
      {
        name: "Hormones",
        biomarkers: [
          { name: "Testosterone, Total", value: 814, unit: "ng/dL", referenceMin: 264, referenceMax: 916 },
          { name: "SHBG", value: 33.7, unit: "nmol/L", referenceMin: 16.5, referenceMax: 55.9 },
          { name: "Testosterone, Free", value: 164.1, unit: "pg/mL", referenceMin: 47.7, referenceMax: 173.9 },
          { name: "Estradiol", value: 17.0, unit: "pg/mL", referenceMin: 8.0, referenceMax: 35.0 },
        ],
      },
      {
        name: "Metabolic Markers",
        biomarkers: [
          { name: "HbA1c", value: 5.6, unit: "%", referenceMin: 4.8, referenceMax: 5.6 },
          { name: "Insulin", value: 10.6, unit: "uIU/mL", referenceMin: 2.6, referenceMax: 24.9 },
          { name: "CRP, Cardiac", value: 0.57, unit: "mg/L", referenceMin: 0, referenceMax: 3.0 },
          { name: "GGT", value: 19, unit: "IU/L", referenceMin: 0, referenceMax: 65 },
        ],
      },
      {
        name: "Other",
        biomarkers: [
          { name: "PSA", value: 0.6, unit: "ng/mL", referenceMin: 0, referenceMax: 4.0 },
        ],
      },
    ],
  },
  {
    dateCollected: "2024-09-20",
    dateReported: "2024-09-25",
    fasting: true,
    panels: [
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Creatinine", value: 0.9, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 123, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "ALT", value: 52, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
      {
        name: "Lipid Panel",
        biomarkers: [
          { name: "Total Cholesterol", value: 116, unit: "mg/dL", referenceMin: 100, referenceMax: 199 },
          { name: "Triglycerides", value: 134, unit: "mg/dL", referenceMin: 0, referenceMax: 149 },
          { name: "HDL", value: 22, unit: "mg/dL", referenceMin: 39 },
          { name: "LDL", value: 70, unit: "mg/dL", referenceMin: 0, referenceMax: 99 },
        ],
      },
      {
        name: "Metabolic Markers",
        biomarkers: [
          { name: "CRP, Cardiac", value: 0.81, unit: "mg/L", referenceMin: 0, referenceMax: 3.0 },
        ],
      },
    ],
  },
  {
    dateCollected: "2024-01-30",
    dateReported: "2024-02-05",
    fasting: true,
    panels: [
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Creatinine", value: 1.02, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 105, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "ALT", value: 67, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
    ],
  },
];

async function main() {
  await prisma.biomarker.deleteMany();
  await prisma.panel.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.healthNote.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      passwordHash,
      name: "Brian O'Brien",
    },
  });

  for (const lr of labResults) {
    await prisma.labResult.create({
      data: {
        userId: user.id,
        dateCollected: new Date(lr.dateCollected),
        dateReported: new Date(lr.dateReported),
        fasting: lr.fasting,
        panels: {
          create: lr.panels.map((panel) => ({
            name: panel.name,
            biomarkers: {
              create: panel.biomarkers.map((bm) => ({
                name: bm.name,
                value: bm.value,
                unit: bm.unit,
                referenceMin: bm.referenceMin ?? null,
                referenceMax: bm.referenceMax ?? null,
                flag: flag(bm.value, bm.referenceMin, bm.referenceMax),
              })),
            },
          })),
        },
      },
    });
  }

  console.log("Seeded database with demo user and 4 lab results");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
