import { Suspense } from "react";
import { Review } from "./review";

export default function ReviewPage() {
  return (
    <Suspense>
      <Review />
    </Suspense>
  );
}
