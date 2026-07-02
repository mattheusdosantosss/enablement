import { getTeamConfig } from "@/lib/config";
import FeedbackClient, { type TeamOption } from "@/components/FeedbackClient";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const config = await getTeamConfig();

  const teams: TeamOption[] = [
    { value: "b2b",     label: "B2B",     members: config.b2b },
    { value: "b2c",     label: "B2C",     members: config.b2c },
    {
      value: "farmers",
      label: "Farmers",
      members: config.farmerSquads.flatMap((s) => s.members),
    },
  ];

  return <FeedbackClient teams={teams} />;
}
