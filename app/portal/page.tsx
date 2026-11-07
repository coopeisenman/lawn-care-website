import { getPortalData } from "@/lib/data/portal";
import PortalView from "@/components/portal/PortalView";

export const metadata = { title: "My Account | Westward Property Care" };

export default async function PortalHome() {
  return <PortalView {...await getPortalData()} />;
}
