export function HomePage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-3">
        <p className="text-sm text-muted-foreground">Media Downloader</p>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-center text-muted-foreground">
          No downloads yet.
        </p>
      </main>
    </div>
  );
}
