export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
      <div>
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
