'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Frontend error boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold">Щось пішло не так</h1>
      <p className="mt-4 text-base">
        Сталася помилка під час завантаження сторінки.
      </p>
      <p className="mt-2 text-sm opacity-80">
        Спробуйте оновити сторінку або повторити дію пізніше.
      </p>

      <button
        onClick={() => reset()}
        className="mt-6 rounded-xl border px-4 py-2"
      >
        Спробувати ще раз
      </button>
    </main>
  );
}