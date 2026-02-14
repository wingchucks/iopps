// TODO: Implement admin layout with sidebar navigation and admin theme

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-admin>
      {/* TODO: Admin sidebar navigation */}
      {children}
    </div>
  );
}
