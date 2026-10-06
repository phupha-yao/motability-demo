import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-3">That page is not part of this demo.</p>
      <Link className="mt-6 inline-block underline underline-offset-4" to="/">
        Back to the start
      </Link>
    </main>
  );
}
