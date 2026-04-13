import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SkillDetailPage({ params }: Props) {
  const { slug } = await params;

  // TODO: Fetch skill from API/database
  // const skill = await getSkill(slug);
  // if (!skill) notFound();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">{slug}</h1>
        <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
          v0.0.0
        </span>
      </div>

      <p className="mt-2 text-gray-600">
        Skill details will be loaded from the registry API.
      </p>

      <div className="mt-6 flex gap-4 text-sm text-gray-500">
        <span>⭐ 0 stars</span>
        <span>📦 0 downloads</span>
        <span>by unknown</span>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Installation</h2>
        <pre className="mt-2 rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          <code>clawhub install {slug}</code>
        </pre>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Description</h2>
        <div className="mt-2 rounded-lg border p-4">
          <p className="text-gray-500 italic">
            SKILL.md content will be rendered here.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Versions</h2>
        <p className="mt-2 text-gray-500">Version history will appear here.</p>
      </div>
    </main>
  );
}
