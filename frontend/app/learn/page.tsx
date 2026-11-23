"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { Flame, Snowflake } from "@/components/icons";
import { AppShell } from "@/components/AppShell";
import { LearnSkeleton } from "@/components/Skeletons";
import { LearnPath } from "@/components/LearnPath";
import { Badge, PageHeader } from "@/components/ui";
import { langOf } from "@/lib/languages";
import { useToday } from "@/lib/useToday";

export default function Learn() {
  const { ready, authenticated } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !authenticated) router.replace("/"); }, [ready, authenticated, router]);
  const { data } = useToday();
  if (!data) return <LearnSkeleton />;
  const lang = langOf(data.course);
  return (
    <AppShell width="narrow">
      <PageHeader
        eyebrow={`${lang.english} · ${data.level}`}
        title={<span lang={lang.code}>{lang.native}</span>}
        description="Work through each unit in order. Pass every lesson, then clear the checkpoint to open the next unit."
        action={
          <div className="flex items-center gap-2">
            <Badge tone="coral" icon={Flame} className="px-3 py-1 text-sm tabular"><span className="sr-only">Streak: </span>{data.streak}</Badge>
            {data.freezesRemaining > 0 && <Badge tone="outline" icon={Snowflake} className="px-3 py-1 text-sm" ><span className="sr-only">Streak freezes: </span>{data.freezesRemaining}</Badge>}
          </div>
        }
      />
      <div className="mt-10"><LearnPath units={data.units} currentUnit={data.currentUnit} nextLessonId={data.nextLessonId} /></div>
    </AppShell>
  );
}
