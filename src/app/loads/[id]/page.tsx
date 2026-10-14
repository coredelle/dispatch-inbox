export default function ReviewPage({ params }: { params: { id: string } }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Review Load</h1>
      <p className="mt-2 text-muted-foreground">id: {params.id} — Review screen coming in Task 5.</p>
    </main>
  );
}
