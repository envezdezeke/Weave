import { Suspense } from "react";
import { Builder } from "./builder";

export default function BuildPage() {
  return (
    <Suspense>
      <Builder />
    </Suspense>
  );
}
