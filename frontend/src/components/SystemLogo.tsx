type SystemLogoProps = {
  className?: string;
  labelClassName?: string;
  showLabel?: boolean;
  size?: number;
  subtitle?: string;
  title?: string;
};

export default function SystemLogo({
  className = "",
  labelClassName = "",
  showLabel = true,
  size = 52,
  subtitle = "Learning platform",
  title = "EDUPulse",
}: SystemLogoProps) {
  const isPrimaryBrand = title === "EDUPulse";

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className="flex items-center justify-center rounded-[1.35rem] bg-[linear-gradient(180deg,#3b82f6_0%,#2563eb_100%)] shadow-[0_12px_24px_rgba(37,99,235,0.35)]"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 64 64"
          className="text-white"
          style={{ width: size * 0.6, height: size * 0.6 }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="EDUPulse logo"
        >
          <path
            d="M32 14 12 22l20 8 16-6.4V38"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 31v8.6c0 2.8 5.3 6.4 12 6.4s12-3.6 12-6.4V31"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M46 27v10" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="46" cy="41.5" r="3.2" fill="currentColor" />
        </svg>
      </div>
      {showLabel && (
        <div className={labelClassName}>
          {subtitle ? <div className="text-xs font-medium uppercase tracking-[0.18em] opacity-75">{subtitle}</div> : null}
          <div className="text-base font-semibold leading-tight">
            {isPrimaryBrand ? (
              <>
                <span>EDU</span>
                <span className="text-sky-400">Pulse</span>
              </>
            ) : (
              title
            )}
          </div>
        </div>
      )}
    </div>
  );
}
