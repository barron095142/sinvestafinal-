"use client";

import { Images } from "lucide-react";
import { Dropzone, MediaGrid, useMedia } from "./media-library";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "./ui/primitives";

export function MediaPage() {
  const media = useMedia();
  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Media Library"
        description="3D product renders, battery modules and project photos. Anything uploaded here can be used on any page from the Content Manager."
        actions={media.items && <Badge tone="blue">{media.items.length} images</Badge>}
      />
      <div className="space-y-6">
        <Dropzone busy={media.uploading > 0} onFiles={(f) => void media.upload(f)} />
        <Card>
          <CardHeader title="All uploads" description="Newest first. Deleting an image that a page still uses will break it on the site." icon={<Images className="size-[18px]" />} />
          <CardBody>
            {media.items === null ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : (
              <MediaGrid
                items={media.items}
                onDelete={(m) => {
                  if (confirm(`Delete ${m.name}? Pages using it will show a broken image.`)) void media.remove(m.id);
                }}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
