type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b-2 border-muted p-4 pt-8">
      <h1 className="text-[64px] font-display font-bold leading-none tracking-tighter text-text-main m-0 p-0 uppercase">
        {title}
      </h1>
      {subtitle && <p className="text-primary text-xl font-bold tracking-widest mt-2 uppercase">{subtitle}</p>}
    </header>
  );
}
