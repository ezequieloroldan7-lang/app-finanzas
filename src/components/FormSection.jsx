function FormSection({ label, children, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold">
          {label}
        </span>
        {hint && (
          <span className="text-zinc-600 text-xs font-normal">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default FormSection;
