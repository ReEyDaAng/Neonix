export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-lg">Сторінку не знайдено.</p>
      <p className="mt-2 text-sm opacity-80">
        Можливо, посилання застаріло або введено неправильно.
      </p>
    </main>
  );
}