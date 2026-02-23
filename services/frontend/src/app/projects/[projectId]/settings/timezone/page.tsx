import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { TimezoneForm } from "./timezone-form";

const TIMEZONES_BY_REGION: Record<string, string[]> = {
  "UTC": [
    "UTC",
  ],
  "Africa": [
    "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers",
    "Africa/Cairo", "Africa/Casablanca", "Africa/Dar_es_Salaam", "Africa/Johannesburg",
    "Africa/Khartoum", "Africa/Lagos", "Africa/Maputo", "Africa/Nairobi",
    "Africa/Tunis", "Africa/Windhoek",
  ],
  "America": [
    "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota",
    "America/Caracas", "America/Chicago", "America/Denver", "America/Edmonton",
    "America/Guatemala", "America/Halifax", "America/Havana", "America/Lima",
    "America/Los_Angeles", "America/Manaus", "America/Mexico_City",
    "America/Montevideo", "America/New_York", "America/Panama",
    "America/Phoenix", "America/Santiago", "America/Sao_Paulo",
    "America/St_Johns", "America/Toronto", "America/Vancouver", "America/Winnipeg",
  ],
  "Antarctica": [
    "Antarctica/Casey", "Antarctica/Davis", "Antarctica/McMurdo",
    "Antarctica/Palmer", "Antarctica/Rothera",
  ],
  "Asia": [
    "Asia/Almaty", "Asia/Amman", "Asia/Baghdad", "Asia/Baku", "Asia/Bangkok",
    "Asia/Beirut", "Asia/Colombo", "Asia/Dhaka", "Asia/Dubai", "Asia/Ho_Chi_Minh",
    "Asia/Hong_Kong", "Asia/Irkutsk", "Asia/Istanbul", "Asia/Jakarta",
    "Asia/Jerusalem", "Asia/Kabul", "Asia/Kamchatka", "Asia/Karachi",
    "Asia/Kathmandu", "Asia/Kolkata", "Asia/Krasnoyarsk", "Asia/Kuala_Lumpur",
    "Asia/Kuwait", "Asia/Magadan", "Asia/Manila", "Asia/Muscat",
    "Asia/Novosibirsk", "Asia/Riyadh", "Asia/Seoul", "Asia/Shanghai",
    "Asia/Singapore", "Asia/Taipei", "Asia/Tashkent", "Asia/Tbilisi",
    "Asia/Tehran", "Asia/Tokyo", "Asia/Vladivostok", "Asia/Yakutsk",
    "Asia/Yangon", "Asia/Yekaterinburg",
  ],
  "Atlantic": [
    "Atlantic/Azores", "Atlantic/Cape_Verde", "Atlantic/Reykjavik",
    "Atlantic/South_Georgia",
  ],
  "Australia": [
    "Australia/Adelaide", "Australia/Brisbane", "Australia/Darwin",
    "Australia/Hobart", "Australia/Melbourne", "Australia/Perth",
    "Australia/Sydney",
  ],
  "Europe": [
    "Europe/Amsterdam", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin",
    "Europe/Brussels", "Europe/Bucharest", "Europe/Budapest", "Europe/Copenhagen",
    "Europe/Dublin", "Europe/Helsinki", "Europe/Kiev", "Europe/Lisbon",
    "Europe/London", "Europe/Madrid", "Europe/Moscow", "Europe/Oslo",
    "Europe/Paris", "Europe/Prague", "Europe/Rome", "Europe/Samara",
    "Europe/Stockholm", "Europe/Vienna", "Europe/Vilnius", "Europe/Warsaw",
    "Europe/Zurich",
  ],
  "Indian": [
    "Indian/Maldives", "Indian/Mauritius",
  ],
  "Pacific": [
    "Pacific/Auckland", "Pacific/Chatham", "Pacific/Fiji", "Pacific/Guam",
    "Pacific/Honolulu", "Pacific/Midway", "Pacific/Noumea",
    "Pacific/Pago_Pago", "Pacific/Tongatapu",
  ],
};

export default async function TimezonePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  let timezone = "UTC";
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { timezone: true },
    });
    timezone = project?.timezone ?? "UTC";
  } catch {
    // Use default
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Timezone</h1>
        <p className="page-subtitle">Configure the default timezone for your project.</p>
      </div>
      <TimezoneForm
        projectId={projectId}
        currentTimezone={timezone}
        timezonesByRegion={TIMEZONES_BY_REGION}
      />
    </div>
  );
}
