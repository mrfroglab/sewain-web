import type { ReactNode } from "react";

/** Section frame shared by the settings blocks. */
export function SettingsSection({ id, title, description, action, children }: { id: string; title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-10 scroll-mt-20">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-body-lg font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-body-sm text-smoke">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
