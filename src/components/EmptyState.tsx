import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  body?: string;
  children?: ReactNode;
};

export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  );
}

