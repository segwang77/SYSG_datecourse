import Link from "next/link";
import { COLLECTIONS } from "@/lib/collections";

export default function CollectionsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">테마 컬렉션</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="card block p-5 transition hover:shadow-md">
            <p className="text-3xl">{c.emoji}</p>
            <p className="mt-2 font-semibold">{c.title}</p>
            <p className="text-sm text-stone-500">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
