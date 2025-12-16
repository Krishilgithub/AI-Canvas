export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/20 p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
         {children}
      </div>
    </div>
  );
}
