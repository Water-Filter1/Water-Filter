import { getSession } from "@/lib/auth";
import {
  getPlombierJobs,
  getActiveInstalls,
  getPlombierCompletedJobs,
  getCompletedInstalls,
} from "@/lib/data";
import { TechJobsTabs } from "@/components/staff/tech-jobs-tabs";

export const dynamic = "force-dynamic";

export default async function PlombierPage() {
  const session = await getSession();
  // A plombier sees only his own jobs; an admin viewing this page sees every job.
  const own = session?.role === "plombier" && !!session?.email;
  const [active, completed] = await Promise.all([
    own ? getPlombierJobs(session!.email) : getActiveInstalls(),
    own ? getPlombierCompletedJobs(session!.email) : getCompletedInstalls(),
  ]);

  return <TechJobsTabs active={active} completed={completed} />;
}
