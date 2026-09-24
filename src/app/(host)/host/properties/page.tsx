import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { requireHost } from "@/lib/auth";
import { db } from "@/lib/db";
import { COVER_IMAGE } from "@/lib/media-query";
import { PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "My properties" };

export default async function HostPropertiesPage() {
  const user = await requireHost();
  const properties = await db.property.findMany({
    where: { hostId: user.id },
    include: {
      media: COVER_IMAGE,
      _count: { select: { roomTypes: true, media: true, bookings: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Button asChild>
          <Link href="/host/properties/new">Add property</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium">No properties yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first listing to start receiving bookings.</p>
          <Button className="mt-4" asChild>
            <Link href="/host/properties/new">Add property</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20"></TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Media</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="relative size-14 overflow-hidden rounded-md bg-muted">
                    {p.media[0] ? (
                      <Image src={p.media[0].url} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <ImageOff className="absolute inset-0 m-auto size-5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {PROPERTY_TYPE_LABEL[p.type]} · {p.city}, {p.country}
                  </p>
                </TableCell>
                <TableCell>{p._count.roomTypes}</TableCell>
                <TableCell>{p._count.media}</TableCell>
                <TableCell>{p._count.bookings}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "PUBLISHED" ? "default" : "outline"}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/host/properties/${p.id}/edit`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
