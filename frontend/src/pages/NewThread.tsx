/**
 * NewThread page — Create a new forum post with draft auto-save.
 *
 * Draft is auto-saved to SQLite (sql.js + IndexedDB) every 2 seconds.
 * On successful submission, the draft is deleted.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { threadsService } from '../services/threads';
import { useDraft } from '../hooks/useDraft';
import { validateThreadTitle, validateThreadContent } from '../utils/validation';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const CATEGORIES = [
  'General', 'Lecture Notes', 'Assignments', 'Exams', 'Resources',
  'Study Groups', 'Off-topic',
];

export function NewThreadPage() {
  const navigate = useNavigate();
  const { content, setContent, clearDraft, draftSaved } = useDraft('thread-new');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState({ title: '', content: '' });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags((prev) => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleResult = validateThreadTitle(title);
    const contentResult = validateThreadContent(content);
    setErrors({ title: titleResult.error, content: contentResult.error });
    if (!titleResult.valid || !contentResult.valid) return;

    setIsSubmitting(true);
    setServerError('');
    try {
      const thread = await threadsService.create({ title, content, category, tags });
      try {
        await clearDraft();
      } catch (draftError) {
        console.error('[NewThreadPage] Failed to clear draft after publish:', draftError);
      }
      navigate(`/thread/${thread.id}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(message ?? 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">New Post</h1>

      {serverError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Title"
          type="text"
          placeholder="What's your question or topic?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
        />

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800
                       focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Tags <span className="text-slate-400">(up to 5)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. calculus"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(); }
              }}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm
                         focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-indigo-400 hover:text-indigo-700"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content with draft save indicator */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="content" className="text-sm font-medium text-slate-700">
              Content
            </label>
          </div>
          <div className="relative">
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post here..."
              rows={12}
              className={[
                'min-h-28 w-full resize-y border-2 px-3 py-2.5 text-sm',
                'text-[var(--ink)] placeholder:text-[rgba(109,90,68,0.75)] focus:outline-none',
                errors.content
                  ? 'border-[var(--danger)] bg-[#fbebe6]'
                  : 'border-[var(--line)] bg-[rgba(255,252,242,0.92)]',
              ].join(' ')}
              aria-describedby={errors.content ? 'content-error' : undefined}
            />
            {draftSaved && (
              <span className="absolute bottom-2 right-2 bg-[rgba(248,241,220,0.96)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                Draft saved
              </span>
            )}
          </div>
          {errors.content && (
            <p id="content-error" role="alert" className="text-xs text-red-600">
              {errors.content}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Publish Post
          </Button>
        </div>
      </form>
    </div>
  );
}
