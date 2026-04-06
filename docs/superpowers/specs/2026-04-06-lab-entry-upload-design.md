# Lab Result Entry + PDF Upload Spec

**Date:** 2026-04-06
**Status:** Approved
**Author:** Brian O'Brien

## Objective

Add the ability to enter new lab results via manual form entry (with templates) or by uploading a LabCorp PDF. The upload flow parses the PDF, pre-fills an editable form, and the user confirms before saving.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry method | PDF upload + manual with templates | PDF is primary flow; manual + templates for one-offs or corrections |
| PDF source | LabCorp only | User's lab provider; consistent structured format |
| Form layout | Accordion panels | Matches existing Lab Results expand/collapse pattern; better overview than tabs |
| Review step | Editable table (pre-filled) | Doubles as both review step for uploads and manual entry form |
| Template source | User's historical data | No need to maintain a master biomarker database; templates grow with usage |
| PDF parsing library | pdf-parse | Lightweight, pure JS, extracts text from PDFs |

## User Flow

1. User clicks "Add Lab Result" button on the Lab Results page
2. Navigates to `/results/add`
3. Two entry paths:
   - **PDF upload:** Drop/select a LabCorp PDF -> backend parses it -> form auto-fills -> user reviews/edits -> save
   - **Manual:** Pick panels from template dropdown -> biomarker names/units/ranges pre-fill -> type values -> save

## Page Layout

```
┌─────────────────────────────────────────┐
│ Add Lab Result                          │
│                                         │
│ Date Collected: [________]              │
│ Date Reported:  [________]              │
│ Fasting:        [Yes / No toggle]       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  📄 Upload LabCorp PDF              │ │
│ │  Drag and drop or click to browse   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▼ Thyroid (3 biomarkers)                │
│   Test      Value  Unit     Ref Range   │
│   TSH       [1.33] uIU/mL  0.45-4.5    │
│   Free T4   [1.24] ng/dL   0.82-1.77   │
│   Free T3   [3.7 ] pg/mL   2.0-4.4     │
│   [+ Add biomarker]                     │
│                                         │
│ ▶ CBC (22 biomarkers)                   │
│ ▶ Metabolic Panel (13 biomarkers)       │
│ ▶ Lipid Panel (7 biomarkers)            │
│                                         │
│ [+ Add Panel ▾]                         │
│                                         │
│ [Save Lab Result]                       │
└─────────────────────────────────────────┘
```

## LabCorp PDF Format

Based on actual LabCorp report (02/05/2026 report, 5 pages):

**Header (page 1):**
- Patient name, DOB, Age, Sex
- Date Collected, Date Received, Date Reported
- Fasting status

**Panel structure:**
- Panel name as a bold heading (e.g., "TSH+Free T4", "CBC With Differential/Platelet", "Comp. Metabolic Panel (14)")
- Table rows: Test name (with footnote superscripts), Value, optional "High"/"Low" flag, Previous Result and Date, Units, Reference Interval
- Reference intervals formatted as "min-max", ">min", or "<max"
- Panels can span multiple pages (e.g., Metabolic Panel continues to page 2)

**Noise to skip:**
- Footnote superscripts on test names (01, 02, A, B, etc.)
- Disclaimers and methodology notes below some tests
- "Previous Result and Date" column (we track history ourselves)
- Page 5 (patient/physician details only)
- Icon legend, footnotes section

## PDF Parsing Strategy

1. Extract full text from PDF using `pdf-parse`
2. Parse header: extract Date Collected, Date Reported, Fasting from first lines
3. Identify panel headings by pattern matching (bold text lines that don't match table rows)
4. For each panel, parse biomarker rows: test name, numeric value, optional flag, unit, reference range
5. Strip footnote superscripts from test names (regex: trailing superscript characters like "01", "A,02")
6. Parse reference ranges: "0.45-4.500" -> min: 0.45, max: 4.5; ">59" -> min: 59; "<90" -> max: 90
7. Compute flag from value vs reference range (don't rely on PDF flag text — compute it for consistency)
8. Return structured JSON matching LabResult shape (without id or userId)

## API Endpoints

### POST /api/labs/parse-pdf
- **Auth:** Yes
- **Content-Type:** multipart/form-data
- **Body:** PDF file
- **Response:** Parsed lab result data (no id, not saved to DB yet)

```json
{
  "dateCollected": "2026-01-29",
  "dateReported": "2026-02-05",
  "fasting": false,
  "panels": [
    {
      "name": "TSH+Free T4",
      "biomarkers": [
        {
          "name": "TSH",
          "value": 1.33,
          "unit": "uIU/mL",
          "referenceMin": 0.45,
          "referenceMax": 4.5,
          "flag": "normal"
        }
      ]
    }
  ]
}
```

### GET /api/labs/templates
- **Auth:** Yes
- **Response:** Unique panels and their biomarkers from user's history (names, units, reference ranges only — no values)

```json
[
  {
    "name": "Thyroid",
    "biomarkers": [
      { "name": "TSH", "unit": "uIU/mL", "referenceMin": 0.45, "referenceMax": 4.5 },
      { "name": "Free T4", "unit": "ng/dL", "referenceMin": 0.82, "referenceMax": 1.77 }
    ]
  }
]
```

### POST /api/labs (already exists — needs body handling)
- **Auth:** Yes
- **Body:** Full lab result with panels and biomarkers
- **Action:** Creates LabResult with nested Panel and Biomarker records
- **Response:** The created lab result with id

## Frontend Components

### AddLabResult page (`src/pages/AddLabResult.tsx`)
- Route: `/results/add`
- Header section: date inputs, fasting toggle, PDF upload zone
- Panels section: accordion list of editable panels
- Footer: "Add Panel" dropdown, "Save Lab Result" button
- State: holds the full lab result being built/edited
- On PDF upload: calls parse-pdf, populates form state
- On save: calls POST /api/labs, redirects to /results

### PdfUpload component (`src/components/PdfUpload.tsx`)
- Drag-and-drop zone with click-to-browse fallback
- Accepts .pdf files only
- Shows upload progress/status
- On successful parse: calls parent callback with parsed data
- On error: shows error message inline

### PanelAccordion component (`src/components/PanelAccordion.tsx`)
- Collapsible panel header showing panel name and biomarker count
- Expanded view: editable table with columns: Test Name, Value, Unit, Ref Min, Ref Max, Flag
- Value field is editable input; flag auto-recalculates on change
- "Add biomarker" button at bottom of table
- "Remove panel" button in header
- Each biomarker row has a remove button

### Route addition
- Add `/results/add` to App.tsx within the protected routes

### Lab Results page update
- Add an "Add Lab Result" button that links to `/results/add`

## Backend Files

| File | Change |
|------|--------|
| New: `backend/src/routes/upload.ts` | PDF parse endpoint with multer for file handling |
| New: `backend/src/lib/parse-labcorp.ts` | LabCorp PDF parsing logic |
| Modify: `backend/src/routes/labs.ts` | Implement POST /api/labs body handling; add GET /api/labs/templates |
| Modify: `backend/src/server.ts` | Mount upload routes |
| New dep: `pdf-parse` | PDF text extraction |
| New dep: `multer` | Multipart file upload handling |

## What's NOT in Scope

- Parsing non-LabCorp PDFs
- Editing existing lab results (only add new)
- Batch upload of multiple PDFs
- Storing the original PDF file
