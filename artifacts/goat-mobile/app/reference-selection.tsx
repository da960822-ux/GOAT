import { Redirect } from "expo-router";

/** Legacy deep links now return to the single discovery selection. */
export default function ReferenceSelectionScreen() {
  return <Redirect href="/" />;
}
