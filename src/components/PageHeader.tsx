import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

