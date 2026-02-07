interface AuthDividerProps {
  text?: string;
}

export function AuthDivider({ text = "Or continue with email" }: AuthDividerProps) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--card-border)]"></div>
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-3 text-foreground0">{text}</span>
      </div>
    </div>
  );
}
