import Link from "next/link";
import type { PublicEvent } from "@/lib/public/types";
import { CATEGORY_LABEL, formatMonthYear } from "@/lib/site";
import { Photo } from "./photo";

export function EventCard({ event, arch = false, sizes = "(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" }: { event: PublicEvent; arch?: boolean; sizes?: string }) {
  const when = formatMonthYear(event.eventDate);
  return (
    <Link href={`/portfolio/${event.slug}`} className="group block">
      <div className={`${arch ? "arch aspect-[3/4]" : "aspect-[4/5] overflow-hidden rounded-xl"} bg-line`}>
        <div className="size-full transition duration-500 group-hover:scale-[1.03]">
          <Photo image={event.cover} sizes={sizes} />
        </div>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-ink group-hover:text-brand">{event.title}</h3>
      <p className="mt-1 text-muted">
        {CATEGORY_LABEL[event.category]}, {event.city}
        {when ? `, ${when}` : ""}
      </p>
    </Link>
  );
}
