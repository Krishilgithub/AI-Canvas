export function PlatformFocus() {
  const platforms = [
    {
      name: "LinkedIn",
      label: "Professional Authority",
      description:
        "Craft thought-leadership posts, carousels, and newsletters that grow your professional network.",
      color: "#0077b5",
      colorClass: "bg-[#0077b5]",
      ringClass: "ring-[#0077b5]/30",
      textClass: "text-[#0077b5] dark:text-blue-400",
      bgClass: "bg-[#0077b5]/10",
      borderClass: "border-[#0077b5]/20",
      icon: (
        <svg
          className="w-10 h-10 fill-current text-white"
          viewBox="0 0 24 24"
        >
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z" />
        </svg>
      ),
    },
    {
      name: "Twitter / X",
      label: "Real-Time Reach",
      description:
        "Trend-aware threads, hooks, and viral replies that drive follows, engagement, and brand recall.",
      color: "#111",
      colorClass: "bg-foreground",
      ringClass: "ring-foreground/30",
      textClass: "text-foreground",
      bgClass: "bg-foreground/10",
      borderClass: "border-foreground/20",
      icon: (
        <svg
          className="w-10 h-10 fill-current text-background"
          viewBox="0 0 24 24"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      ),
    },
    {
      name: "Reddit",
      label: "Community Influence",
      description:
        "Native-feeling posts and comments that spark discussions and position you as a subreddit authority.",
      color: "#FF4500",
      colorClass: "bg-[#FF4500]",
      ringClass: "ring-[#FF4500]/30",
      textClass: "text-[#FF4500] dark:text-orange-400",
      bgClass: "bg-[#FF4500]/10",
      borderClass: "border-[#FF4500]/20",
      icon: (
        <svg
          className="w-10 h-10 fill-current text-white"
          viewBox="0 0 24 24"
        >
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-32 border-y border-border/50 bg-secondary/20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">
          One AI. Three Platforms.
        </h2>
        <p className="text-muted-foreground mb-16 max-w-xl mx-auto text-lg">
          AI Canvas generates uniquely-tailored content for each platform's
          tone, format, and audience — all from the same dashboard.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-background border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default"
            >
              {/* Icon */}
              <div
                className={`w-20 h-20 rounded-2xl ${p.colorClass} flex items-center justify-center shadow-lg ring-4 ring-background ${p.ringClass} group-hover:scale-105 transition-transform duration-300`}
              >
                {p.icon}
              </div>

              {/* Name & label */}
              <div>
                <h3 className="font-bold text-xl font-heading">{p.name}</h3>
                <span
                  className={`inline-block mt-1 text-xs font-semibold px-3 py-0.5 rounded-full ${p.bgClass} ${p.borderClass} border ${p.textClass}`}
                >
                  {p.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed text-center">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
