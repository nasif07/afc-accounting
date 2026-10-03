// shadcn-generated, trimmed for this app: bg-border (a semantic token this
// app doesn't define — see components/ui/button.jsx's note) swapped for the
// direct slate-200 utility used for every other border/divider in the app.
import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/utils/cn"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-slate-200 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props} />
  );
}

export { Separator }
