import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { PdfUpload } from "../components/PdfUpload";
import { PanelAccordion } from "../components/PanelAccordion";
import type {
  Biomarker,
  Panel,
  ParsedLabResult,
  PanelTemplate,
} from "../types";

export function AddLabResult() {
  const navigate = useNavigate();

  const [dateCollected, setDateCollected] = useState("");
  const [dateReported, setDateReported] = useState("");
  const [fasting, setFasting] = useState(false);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [templates, setTemplates] = useState<PanelTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const templateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PanelTemplate[]>("/labs/templates")
      .then(setTemplates)
      .catch(() => {});
  }, []);

  function handlePdfParsed(result: ParsedLabResult) {
    setDateCollected(result.dateCollected);
    setDateReported(result.dateReported);
    setFasting(result.fasting);
    setPanels(result.panels);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        templateMenuRef.current &&
        !templateMenuRef.current.contains(event.target as Node)
      ) {
        setShowTemplateMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function updatePanelBiomarkers(panelIndex: number, biomarkers: Biomarker[]) {
    setPanels((prev) =>
      prev.map((p, i) => (i === panelIndex ? { ...p, biomarkers } : p)),
    );
  }

  function removePanel(index: number) {
    setPanels((prev) => prev.filter((_, i) => i !== index));
  }

  function addPanelFromTemplate(template: PanelTemplate) {
    const newPanel: Panel = {
      name: template.name,
      biomarkers: template.biomarkers.map((b) => ({
        name: b.name,
        value: 0,
        unit: b.unit,
        referenceMin: b.referenceMin,
        referenceMax: b.referenceMax,
        flag: "normal" as const,
      })),
    };
    setPanels((prev) => [...prev, newPanel]);
    setShowTemplateMenu(false);
  }

  function addEmptyPanel() {
    setPanels((prev) => [
      ...prev,
      {
        name: "New Panel",
        biomarkers: [{ name: "", value: 0, unit: "", flag: "normal" as const }],
      },
    ]);
    setShowTemplateMenu(false);
  }

  async function handleSave() {
    if (!dateCollected || !dateReported) {
      setError("Date collected and date reported are required");
      return;
    }
    if (panels.length === 0) {
      setError("Add at least one panel with biomarkers");
      return;
    }

    const cleanPanels = panels
      .map((p) => ({
        ...p,
        biomarkers: p.biomarkers.filter((b) => b.name.trim() !== ""),
      }))
      .filter((p) => p.biomarkers.length > 0);

    if (cleanPanels.length === 0) {
      setError("Add at least one biomarker with a name");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api("/labs", {
        method: "POST",
        body: JSON.stringify({
          dateCollected,
          dateReported,
          fasting,
          panels: cleanPanels,
        }),
      });
      navigate("/results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save lab result",
      );
    } finally {
      setSaving(false);
    }
  }

  const usedPanelNames = new Set(panels.map((p) => p.name));
  const availableTemplates = templates.filter(
    (t) => !usedPanelNames.has(t.name),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Lab Result</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a LabCorp PDF or enter results manually
        </p>
      </div>

      {/* Header fields */}
      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date Collected
          </label>
          <input
            type="date"
            value={dateCollected}
            onChange={(e) => setDateCollected(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date Reported
          </label>
          <input
            type="date"
            value={dateReported}
            onChange={(e) => setDateReported(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={fasting}
              onChange={(e) => setFasting(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Fasting
          </label>
        </div>
      </div>

      {/* PDF Upload */}
      <PdfUpload onParsed={handlePdfParsed} />

      {/* Panels */}
      {panels.length > 0 && (
        <div className="space-y-4">
          {panels.map((panel, i) => (
            <PanelAccordion
              key={`${panel.name}-${i}`}
              name={panel.name}
              biomarkers={panel.biomarkers}
              defaultExpanded={i === 0}
              onUpdate={(biomarkers) => updatePanelBiomarkers(i, biomarkers)}
              onRemovePanel={() => removePanel(i)}
            />
          ))}
        </div>
      )}

      {/* Add Panel */}
      <div className="relative" ref={templateMenuRef}>
        <button
          onClick={() => setShowTemplateMenu(!showTemplateMenu)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add Panel
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {showTemplateMenu && (
          <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={addEmptyPanel}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Empty panel
            </button>
            {availableTemplates.length > 0 && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <p className="px-4 py-1 text-xs font-medium uppercase text-gray-400">
                  From history
                </p>
                {availableTemplates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => addPanelFromTemplate(t)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t.name}{" "}
                    <span className="text-xs text-gray-400">
                      ({t.biomarkers.length} biomarkers)
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Lab Result"}
      </button>
    </div>
  );
}
