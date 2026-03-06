import { useState, useCallback, type FormEvent } from "react";
import { StickyNote, Plus, Trash2, Calendar } from "lucide-react";
import type { HealthNote } from "../types";

const NOTES_STORAGE_KEY = "healthtracker_notes";

function loadNotes(): HealthNote[] {
  const stored = localStorage.getItem(NOTES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as HealthNote[];
    } catch {
      return [];
    }
  }
  return [];
}

function saveNotes(notes: HealthNote[]) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function Notes() {
  const [notes, setNotes] = useState<HealthNote[]>(loadNotes);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const addNote = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !content.trim()) return;

      const newNote: HealthNote = {
        id: `note-${Date.now()}`,
        date,
        title: title.trim(),
        content: content.trim(),
      };

      const updated = [newNote, ...notes];
      setNotes(updated);
      saveNotes(updated);
      setTitle("");
      setContent("");
      setDate(new Date().toISOString().split("T")[0]);
    },
    [title, content, date, notes],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      saveNotes(updated);
    },
    [notes],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Health Notes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Keep track of symptoms, medications, and observations
        </p>
      </div>

      {/* Add note form */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Add New Note</h2>
        </div>

        <form onSubmit={addNote} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="note-title"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <input
                id="note-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Started new supplement"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="note-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Date
              </label>
              <input
                id="note-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="note-content"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Content
            </label>
            <textarea
              id="note-content"
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </button>
        </form>
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <StickyNote className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              No notes yet
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Add your first health note above
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(note.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                    {note.content}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="ml-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete note: ${note.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
